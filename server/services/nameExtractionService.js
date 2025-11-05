const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Advanced Name Extraction Service
 * Uses word-level OCR data with positional analysis for better name detection
 */
class NameExtractionService {
    constructor() {
        this.worker = null;
    }

    /**
     * Initialize Tesseract worker with optimized settings
     */
    async initializeWorker() {
        if (this.worker) return this.worker;

        try {
            this.worker = await Tesseract.createWorker('eng', 1, {
                logger: (info) => {
                    if (process.env.NODE_ENV === 'development' && info.status === 'recognizing text') {
                        console.log(`Name Extraction OCR Progress: ${Math.round(info.progress * 100)}%`);
                    }
                }
            });

            // Configure Tesseract for better text recognition
            await this.worker.setParameters({
                tessedit_pageseg_mode: '6', // Assume uniform block of text
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 /-:',
                preserve_interword_spaces: '1',
            });

            return this.worker;
        } catch (error) {
            console.error('Failed to initialize Tesseract worker:', error);
            throw error;
        }
    }

    /**
     * Extract name using advanced word-level OCR analysis
     */
    async extractName(imagePath, userName = null) {
        try {
            const worker = await this.initializeWorker();
            
            // Perform OCR with word-level data
            const { data } = await worker.recognize(imagePath);
            
            // Extract words with their positions and confidence
            const words = data.words || [];
            
            console.log(`Extracted ${words.length} words from document`);
            
            // Strategy 1: Find name using positional analysis
            // Names are typically:
            // - In the top portion of the document
            // - Before DOB/Date fields
            // - Have high confidence scores
            // - Contain 2-4 capitalized words
            
            // Filter words in top portion (first 40% of document height)
            const docHeight = data.height || 1000;
            const topThreshold = docHeight * 0.4;
            
            const topWords = words.filter(word => {
                const bbox = word.bbox;
                const wordCenterY = (bbox.y0 + bbox.y1) / 2;
                return wordCenterY < topThreshold && word.confidence > 60;
            });

            console.log(`Found ${topWords.length} words in top portion with confidence > 60%`);

            // Group words by line (similar Y coordinates)
            const lines = this.groupWordsByLine(topWords);
            console.log(`Grouped into ${lines.length} lines`);

            // Strategy 2: Look for name-like patterns in lines
            const potentialNames = [];
            
            for (const line of lines) {
                const lineText = line.map(w => w.text).join(' ').trim();
                
                // Check if line looks like a name (2-4 capitalized words, no numbers)
                const namePattern = /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/;
                const match = lineText.match(namePattern);
                
                if (match) {
                    const name = match[1];
                    // Skip document keywords
                    if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE/i.test(name)) {
                        const avgConfidence = line.reduce((sum, w) => sum + w.confidence, 0) / line.length;
                        potentialNames.push({
                            name: name,
                            confidence: avgConfidence,
                            line: lineText,
                            position: line[0].bbox
                        });
                        console.log(`Found potential name: "${name}" (confidence: ${avgConfidence.toFixed(1)}%)`);
                    }
                }
            }

            // Strategy 3: If user name provided, try to match with OCR words
            if (userName && potentialNames.length > 0) {
                const userNameUpper = userName.toUpperCase();
                const userNameWords = userNameUpper.split(' ').filter(w => w.length > 0);
                
                for (const candidate of potentialNames) {
                    const candidateUpper = candidate.name.toUpperCase();
                    const candidateWords = candidateUpper.split(' ').filter(w => w.length > 0);
                    
                    // Check word overlap
                    const matchingWords = userNameWords.filter(w1 => 
                        candidateWords.some(w2 => {
                            // Handle OCR errors: 'rn' -> 'm'
                            const correctedW2 = w2.replace('M', 'RN');
                            const correctedW1 = w1.replace('RN', 'M');
                            return w2 === w1 || correctedW2 === w1 || w2 === correctedW1 || 
                                   w2.includes(w1) || w1.includes(w2);
                        })
                    );
                    
                    if (matchingWords.length >= userNameWords.length * 0.8) {
                        console.log(`Matched "${candidate.name}" with user name "${userName}"`);
                        return candidate.name;
                    }
                }
            }

            // Strategy 4: Return the highest confidence name if found
            if (potentialNames.length > 0) {
                // Sort by confidence and return best match
                potentialNames.sort((a, b) => b.confidence - a.confidence);
                console.log(`Returning highest confidence name: "${potentialNames[0].name}"`);
                return potentialNames[0].name;
            }

            // Strategy 5: Fallback to simple text extraction
            const fullText = data.text || '';
            console.log('Falling back to full text extraction');
            return this.extractNameFromText(fullText, userName);

        } catch (error) {
            console.error('Name extraction error:', error);
            // Fallback to text-based extraction
            return null;
        }
    }

    /**
     * Group words by line based on Y coordinate similarity
     */
    groupWordsByLine(words) {
        if (words.length === 0) return [];

        // Sort words by Y coordinate
        const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
        
        const lines = [];
        let currentLine = [sorted[0]];
        
        for (let i = 1; i < sorted.length; i++) {
            const currentWord = sorted[i];
            const lastWord = currentLine[currentLine.length - 1];
            
            // Words are on same line if Y coordinates are close (within 10 pixels or 5% of height)
            const lineHeight = lastWord.bbox.y1 - lastWord.bbox.y0;
            const threshold = Math.max(10, lineHeight * 0.5);
            const yDiff = Math.abs(currentWord.bbox.y0 - lastWord.bbox.y0);
            
            if (yDiff < threshold) {
                currentLine.push(currentWord);
            } else {
                lines.push(currentLine);
                currentLine = [currentWord];
            }
        }
        
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Fallback: Extract name from plain text
     */
    extractNameFromText(text, userName) {
        if (!text) return null;

        // Try to find user's name directly
        if (userName) {
            const userNameUpper = userName.toUpperCase();
            const textUpper = text.toUpperCase();
            
            // Check if all words from user name appear in text
            const userNameWords = userNameUpper.split(' ').filter(w => w.length > 0);
            const allWordsFound = userNameWords.every(word => textUpper.includes(word));
            
            if (allWordsFound) {
                // Try to extract the name pattern
                const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
                
                for (const line of lines) {
                    const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
                    if (nameMatch && nameMatch[1]) {
                        const name = nameMatch[1];
                        if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE/i.test(name)) {
                            return name;
                        }
                    }
                }
            }
        }

        // Look for standalone capitalized words
        const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
        for (const line of lines) {
            const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
            if (nameMatch && nameMatch[1]) {
                const name = nameMatch[1];
                if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE/i.test(name)) {
                    return name;
                }
            }
        }

        return null;
    }

    /**
     * Cleanup worker
     */
    async terminate() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}

module.exports = new NameExtractionService();
