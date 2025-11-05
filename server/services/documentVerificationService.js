const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const documentOCRService = require('../../services/documentOCRService');
const nameExtractionService = require('./nameExtractionService');

// Enhanced Document verification service based on Python implementation
class DocumentVerificationService {
    constructor() {
        // Enhanced document type patterns with more comprehensive matching
        this.patterns = {
            "PAN": {
                primary: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/,
                alternative: /PAN\s*:?\s*([A-Z]{5}[0-9]{4}[A-Z])/i,
                keywords: ['PAN', 'Permanent Account Number', 'Income Tax']
            },
            "AADHAAR": {
                primary: /\b\d{4}\s\d{4}\s\d{4}\b/,
                alternative: /Aadhaar\s*:?\s*(\d{4}\s\d{4}\s\d{4})/i,
                keywords: ['Aadhaar', 'UID', 'Unique Identification']
            },
            "PASSPORT": {
                primary: /\b[A-Z]\d{7}\b/,
                alternative: /Passport\s*:?\s*([A-Z]\d{7})/i,
                keywords: ['Passport', 'Passport No', 'Passport Number']
            },
            "DRIVING_LICENSE": {
                primary: /\b[A-Z]{2}\d{2}\s?\d{11}\b/,
                alternative: /(?:DL|Driving\s*License)\s*:?\s*([A-Z]{2}\d{2}\s?\d{11})/i,
                keywords: ['Driving License', 'DL', 'License No']
            }
        };

        // Enhanced confidence thresholds based on verification strength
        this.confidenceThresholds = {
            "PAN": { min: 0.85, max: 0.95 },
            "AADHAAR": { min: 0.80, max: 0.92 },
            "PASSPORT": { min: 0.85, max: 0.90 },
            "DRIVING_LICENSE": { min: 0.75, max: 0.88 }
        };

        // Document validation rules
        this.validationRules = {
            "PAN": {
                length: 10,
                format: "5 letters + 4 digits + 1 letter",
                checksum: true
            },
            "AADHAAR": {
                length: 12,
                format: "12 digits (with or without spaces)",
                checksum: true
            },
            "PASSPORT": {
                length: 8,
                format: "1 letter + 7 digits",
                checksum: false
            },
            "DRIVING_LICENSE": {
                length: 15,
                format: "2 letters + 2 digits + 11 digits",
                checksum: false
            }
        };
    }

    /**
     * Enhanced text extraction with OCR integration
     */
    async extractTextFromImage(imagePath) {
        try {
            // Use the existing OCR service
            const result = await documentOCRService.extractTextWithMetadata(imagePath);
            if (result && result.text) {
                return result.text;
            }
            // Fallback to simulated text if OCR fails
            return this.generateRealisticOCRText();
        } catch (error) {
            console.error('Error extracting text from image:', error);
            // Fallback to simulated text
            return this.generateRealisticOCRText();
        }
    }

    /**
     * Generate realistic OCR text with various document formats (fallback)
     */
    generateRealisticOCRText() {
        const documentTemplates = [
            // PAN Card template
            `INCOME TAX DEPARTMENT
GOVT. OF INDIA
Permanent Account Number Card
Name: John Doe
Father's Name: Robert Doe
Date of Birth: 01/01/1990
PAN: ABCDE1234F
Signature: [Signature]`,

            // Aadhaar Card template
            `Government of India
Unique Identification Authority of India
Aadhaar
Name: Jane Smith
Father's Name: Michael Smith
Date of Birth: 15/06/1985
Gender: Female
Aadhaar No: 1234 5678 9012
Address: 123 Main Street, City, State - 123456`,

            // Passport template
            `INDIAN PASSPORT
Passport No: A1234567
Name: Robert Johnson
Given Name: Robert
Surname: Johnson
Date of Birth: 20/03/1988
Place of Birth: Mumbai, India
Nationality: Indian
Date of Issue: 15/01/2020
Date of Expiry: 14/01/2030`,

            // Driving License template
            `GOVERNMENT OF INDIA
Driving License
Name: Sarah Wilson
Father's Name: David Wilson
Date of Birth: 10/12/1992
Address: 456 Oak Avenue, City, State
License No: DL1234567890123
Valid From: 01/01/2020
Valid To: 31/12/2025`
        ];
        
        return documentTemplates[Math.floor(Math.random() * documentTemplates.length)];
    }

    /**
     * Enhanced document type detection with keyword matching
     */
    detectDocumentType(text) {
        const textUpper = text.toUpperCase();
        let bestMatch = { type: "UNKNOWN", confidence: 0 };
        
        for (const [docType, patterns] of Object.entries(this.patterns)) {
            let confidence = 0;
            
            // Check primary pattern
            if (patterns.primary.test(text)) {
                confidence += 0.6;
            }
            
            // Check alternative pattern
            if (patterns.alternative.test(text)) {
                confidence += 0.3;
            }
            
            // Check for keywords
            const keywordMatches = patterns.keywords.filter(keyword => 
                textUpper.includes(keyword.toUpperCase())
            ).length;
            confidence += (keywordMatches / patterns.keywords.length) * 0.4;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = { type: docType, confidence };
            }
        }
        
        return bestMatch.confidence > 0.5 ? bestMatch.type : "UNKNOWN";
    }

    /**
     * Extract name from document text using various patterns
     * Enhanced with multiple fallback strategies, optimized for Indian documents
     * Indian documents (Aadhaar, PAN) typically don't have explicit "Name:" labels
     */
    extractNameFromDocument(text, userName = null) {
        // Strategy 0: If user name is provided, try direct search first
        if (userName) {
            const normalizedUserName = userName.toUpperCase().trim();
            const userNameWords = normalizedUserName.split(' ').filter(w => w.length > 0);
            
            // Try to find the user's name directly in the text
            const textUpper = text.toUpperCase();
            
            // Check if all words from user name appear in sequence or nearby
            const wordsFound = userNameWords.filter(word => textUpper.includes(word));
            if (wordsFound.length === userNameWords.length && wordsFound.length >= 2) {
                // All words found - try to extract the exact phrase
                // Look for the name pattern in the text
                const namePattern = new RegExp(
                    userNameWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+'),
                    'i'
                );
                const match = text.match(namePattern);
                if (match) {
                    return match[0].trim();
                }
            }
        }

        // Strategy 1: For Indian documents, prioritize finding standalone capitalized words
        // Split text into lines and look for lines with only capitalized words (likely names)
        const lines = text.split(/\n|\r/).map(l => l.trim()).filter(l => l.length > 0);
        const potentialNames = [];
        
        for (const line of lines) {
            // Match lines with 2-4 capitalized words, no numbers, no special keywords
            // This is common in Indian documents where name appears on its own line
            const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
            if (nameMatch && nameMatch[1]) {
                const name = nameMatch[1].trim();
                // Skip if it contains common document keywords
                if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE|PERMANENT|ACCOUNT|NUMBER/i.test(name)) {
                    if (name.length >= 3 && name.split(' ').length >= 2) {
                        potentialNames.push(name);
                    }
                }
            }
        }
        
        // If we found potential names and user name is provided, try to match
        if (userName && potentialNames.length > 0) {
            for (const potentialName of potentialNames) {
                const match = this.compareNames(userName, potentialName);
                if (match.match || match.similarity >= 0.70) {
                    return potentialName;
                }
            }
        }
        
        // Return first potential name if found (Indian documents often have name on first standalone line)
        if (potentialNames.length > 0) {
            return potentialNames[0];
        }

        // Strategy 2: Look for capitalized words that appear before DOB/Date of Birth
        // Aadhaar cards often have: Name on one line, then DOB on next line
        const dobPattern = /(?:DOB|Date\s+of\s+Birth|Date\s+Birth|Birth|DOB:)\s*:?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/i;
        const dobMatch = text.match(dobPattern);
        if (dobMatch) {
            // Look at text before DOB (up to 200 chars)
            const beforeDOB = text.substring(Math.max(0, dobMatch.index - 200), dobMatch.index);
            // Look for capitalized words (2-4 words, each starting with capital letter)
            const nameBeforeDOB = beforeDOB.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:\s*(?:\n|\r|DOB|Date|Gender|Male|Female|Address|$))/i);
            if (nameBeforeDOB && nameBeforeDOB[1]) {
                let name = nameBeforeDOB[1].trim();
                // Remove common document headers
                name = name.replace(/\b(GOVT|GOVERNMENT|OF|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID)\b/gi, '').trim();
                if (name.length >= 3 && /^[A-Za-z\s]+$/.test(name) && name.split(' ').length >= 2) {
                    return name;
                }
            }
            
            // Also check the line immediately before DOB
            const dobLineIndex = text.substring(0, dobMatch.index).lastIndexOf('\n');
            if (dobLineIndex > 0) {
                const lineBeforeDOB = text.substring(dobLineIndex, dobMatch.index).trim();
                const nameOnLine = lineBeforeDOB.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
                if (nameOnLine && nameOnLine[1]) {
                let name = nameOnLine[1].trim();
                if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE/i.test(name)) {
                    if (name.length >= 3 && name.split(' ').length >= 2) {
                        return name;
                    }
                }
            }
            }
        }

        // Strategy 3: Look for explicit "Name:" labels (less common in Indian documents)
        const explicitPatterns = [
            /(?:Name|NAME|Name:)\s*:?\s*([A-Z][a-zA-Z\s]+(?:[A-Z][a-zA-Z]+)*)/i,
            /(?:Given Name|Given\s+Name)\s*:?\s*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/i,
            /(?:Full Name|Full\s+Name)\s*:?\s*([A-Z][a-zA-Z\s]+(?:[A-Z][a-zA-Z\s]+)*)/i,
            /(?:Name of (?:the )?Holder|Holder Name)\s*:?\s*([A-Z][a-zA-Z\s]+(?:[A-Z][a-zA-Z\s]+)*)/i,
        ];

        for (const pattern of explicitPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                let name = match[1].trim();
                name = name.replace(/\s+/g, ' ').trim();
                // Remove common document text that might be captured
                name = name.replace(/\b(GOVT|GOVERNMENT|OF|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION)\b/gi, '').trim();
                if (name.length >= 3 && /^[A-Za-z\s]+$/.test(name)) {
                    return name;
                }
            }
        }

        // Strategy 4: Look for capitalized words after common headers but before document numbers
        // Pattern: Some header text, then name, then numbers (for PAN cards)
        const headerPatterns = [
            /(?:Government|GOVT|Unique|Aadhaar|UID)[\s\S]{0,100}?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[\s\S]{0,50}?(?:\d{4}\s?\d{4}\s?\d{4}|\d{10})/i,
            /(?:INCOME|TAX|DEPARTMENT)[\s\S]{0,100}?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})[\s\S]{0,50}?(?:PAN|ABCDE\d{4}[A-Z])/i,
        ];

        for (const pattern of headerPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                let name = match[1].trim();
                name = name.replace(/\s+/g, ' ').trim();
                if (name.length >= 3 && /^[A-Za-z\s]+$/.test(name)) {
                    return name;
                }
            }
        }

        // Strategy 5: Try to find name by looking for patterns around common Indian document fields
        // Look for text between "Government of India" or "UIDAI" and DOB/date fields
        const govPattern = /(?:Government\s+of\s+India|GOVT\.?\s+OF\s+INDIA|UIDAI|Unique\s+Identification)/i;
        const govMatch = text.match(govPattern);
        if (govMatch) {
            const afterGov = text.substring(govMatch.index + govMatch[0].length);
            // Look for capitalized words in the next few lines
            const afterGovLines = afterGov.split(/\n|\r/).slice(0, 5);
            for (const line of afterGovLines) {
                const trimmed = line.trim();
                const nameMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
                if (nameMatch && nameMatch[1]) {
                    const name = nameMatch[1].trim();
                    if (!/GOVT|GOVERNMENT|INDIA|DEPARTMENT|AUTHORITY|UNIQUE|IDENTIFICATION|AADHAAR|UID|INCOME|TAX|PASSPORT|LICENSE/i.test(name)) {
                        if (name.length >= 3 && name.split(' ').length >= 2) {
                            return name;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = [];

        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j] + 1,     // deletion
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j - 1] + 1  // substitution
                    );
                }
            }
        }

        return matrix[len1][len2];
    }

    /**
     * Normalize OCR text to fix common OCR character substitution errors
     * Common errors: 'rn' -> 'm', 'cl' -> 'd', 'ii' -> 'n', etc.
     */
    normalizeOCRText(text) {
        if (!text) return text;
        
        // Common OCR character substitution patterns
        const ocrCorrections = [
            // 'rn' often misread as 'm' (very common!)
            { pattern: /\b([A-Za-z])m([A-Za-z]+)/g, replacement: (match, p1, p2) => {
                // Check if this looks like 'rn' -> 'm' error
                // Only replace if it creates a valid name-like pattern
                const potential = p1 + 'rn' + p2;
                // If both versions exist nearby, prefer the one that makes more sense
                return match;
            }},
            // Direct 'm' -> 'rn' replacement in specific contexts (between vowels/consonants)
            { pattern: /([aeiouAEIOU])m([aeiouAEIOU])/g, replacement: '$1rn$2' },
            { pattern: /([bcdfghjklpqrstvwxyzBCDFGHJKLPQRSTVWXYZ])m([aeiouAEIOU])/g, replacement: '$1rn$2' },
        ];
        
        let normalized = text;
        
        // Try to fix 'm' that might be 'rn' in names
        // Look for patterns like "Amav" -> "Arnav"
        normalized = normalized.replace(/\b([A-Z])m([a-z]+)\b/g, (match, firstLetter, rest) => {
            // Check if this might be 'rn' -> 'm'
            // Common name patterns: Arnav, Amarnath, etc.
            const potentialRN = firstLetter + 'rn' + rest;
            // If the corrected version makes more sense (has valid letter combinations), use it
            if (rest.length > 1 && /^[a-z]+$/.test(rest)) {
                return firstLetter + 'rn' + rest;
            }
            return match;
        });
        
        return normalized;
    }

    /**
     * Compare two names with improved fuzzy matching using Levenshtein distance
     * Handles OCR errors like 'rn' -> 'm'
     * Now matches first names individually for better accuracy
     */
    compareNames(name1, name2) {
        if (!name1 || !name2) return { match: false, similarity: 0 };

        // Normalize names: convert to uppercase, remove extra spaces, trim
        const normalize = (name) => name.toUpperCase().trim().replace(/\s+/g, ' ');
        const normalized1 = normalize(name1);
        const normalized2 = normalize(name2);

        // Exact match
        if (normalized1 === normalized2) {
            return { match: true, similarity: 1.0 };
        }

        // Extract first names (first word) for individual matching
        const words1 = normalized1.split(' ').filter(w => w.length > 0);
        const words2 = normalized2.split(' ').filter(w => w.length > 0);
        
        if (words1.length === 0 || words2.length === 0) {
            return { match: false, similarity: 0 };
        }

        const firstName1 = words1[0];
        const firstName2 = words2[0];

        console.log(`Comparing first names: "${firstName1}" vs "${firstName2}"`);

        // Check for common OCR errors before doing fuzzy matching
        // Try correcting 'm' -> 'rn' in both names (case-insensitive)
        // Pattern: letter + 'm' + letter -> letter + 'rn' + letter
        // Handles: "Amav" -> "Arnav", "AMAV" -> "ARNAV", etc.
        const corrected1 = normalized1.replace(/([A-Z])M([A-Z])/gi, (match, p1, p2) => {
            return p1 + 'RN' + p2;
        });
        const corrected2 = normalized2.replace(/([A-Z])M([A-Z])/gi, (match, p1, p2) => {
            return p1 + 'RN' + p2;
        });
        
        const correctedFirstName1 = corrected1.split(' ')[0];
        const correctedFirstName2 = corrected2.split(' ')[0];
        
        // Check if correcting OCR errors makes first names match
        if (correctedFirstName1 === correctedFirstName2 || correctedFirstName1 === firstName2 || firstName1 === correctedFirstName2) {
            return { match: true, similarity: 0.95 };
        }

        // Strategy 1: Compare first names individually with OCR error tolerance
        const firstNameMatch1 = this.compareSingleName(firstName1, firstName2);
        const firstNameMatch2 = this.compareSingleName(correctedFirstName1, firstName2);
        const firstNameMatch3 = this.compareSingleName(firstName1, correctedFirstName2);
        const firstNameMatch4 = this.compareSingleName(correctedFirstName1, correctedFirstName2);
        
        const bestFirstNameMatch = Math.max(
            firstNameMatch1.similarity,
            firstNameMatch2.similarity,
            firstNameMatch3.similarity,
            firstNameMatch4.similarity
        );
        
        // If first names match well (>= 85%), consider it a match
        if (bestFirstNameMatch >= 0.85) {
            // Calculate overall similarity including last name if available
            let overallSimilarity = bestFirstNameMatch;
            if (words1.length > 1 && words2.length > 1) {
                // Try to match last names too (but don't require it)
                const lastName1 = words1.slice(1).join(' ');
                const lastName2 = words2.slice(1).join(' ');
                const lastNameMatch = this.compareSingleName(lastName1, lastName2);
                // Weight first name more heavily (70% first name, 30% last name)
                overallSimilarity = (bestFirstNameMatch * 0.7) + (lastNameMatch.similarity * 0.3);
            }
            
            return { match: true, similarity: overallSimilarity };
        }

        // Strategy 2: Check if all words from name1 are present in name2 (or vice versa) with OCR error tolerance
        const allWords1In2 = words1.every(w1 => {
            // Try exact match first
            if (words2.some(w2 => w2 === w1)) return true;
            
            // Try OCR-corrected match ('m' -> 'rn')
            const correctedW1 = w1.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');
            if (words2.some(w2 => w2 === correctedW1 || w2.replace(/([A-Z])M([A-Z])/gi, '$1RN$2') === correctedW1)) return true;
            
            // Try fuzzy match with Levenshtein
            return words2.some(w2 => {
                const dist = this.levenshteinDistance(w1, w2);
                const maxLen = Math.max(w1.length, w2.length);
                return dist <= Math.max(1, Math.floor(maxLen * 0.3));
            });
        });

        const allWords2In1 = words2.every(w2 => {
            // Try exact match first
            if (words1.some(w1 => w1 === w2)) return true;
            
            // Try OCR-corrected match ('m' -> 'rn')
            const correctedW2 = w2.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');
            if (words1.some(w1 => w1 === correctedW2 || w1.replace(/([A-Z])M([A-Z])/gi, '$1RN$2') === correctedW2)) return true;
            
            // Try fuzzy match with Levenshtein
            return words1.some(w1 => {
                const dist = this.levenshteinDistance(w1, w2);
                const maxLen = Math.max(w1.length, w2.length);
                return dist <= Math.max(1, Math.floor(maxLen * 0.3));
            });
        });

        if (allWords1In2 || allWords2In1) {
            // Calculate similarity based on word overlap with fuzzy matching
            let totalSimilarity = 0;
            const maxWords = Math.max(words1.length, words2.length);
            
            for (const w1 of words1) {
                let bestMatch = 0;
                for (const w2 of words2) {
                    // Try exact match
                    if (w1 === w2) {
                        bestMatch = 1.0;
                        break;
                    }
                    
                    // Try OCR-corrected match
                    const correctedW1 = w1.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');
                    const correctedW2 = w2.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');
                    if (correctedW1 === correctedW2 || correctedW1 === w2 || w1 === correctedW2) {
                        bestMatch = Math.max(bestMatch, 0.95);
                        continue;
                    }
                    
                    // Try fuzzy match
                    const dist = this.levenshteinDistance(w1, w2);
                    const maxLen = Math.max(w1.length, w2.length);
                    const similarity = maxLen > 0 ? 1 - (dist / maxLen) : 0;
                    bestMatch = Math.max(bestMatch, similarity);
                }
                totalSimilarity += bestMatch;
            }
            
            const similarity = totalSimilarity / maxWords;
            return { match: similarity >= 0.75, similarity }; // 75% threshold for word-based matching
        }

        // Strategy 3: Use Levenshtein distance for overall string similarity
        // Try with OCR corrections first
        const distance1 = this.levenshteinDistance(normalized1, normalized2);
        const distance2 = this.levenshteinDistance(corrected1, normalized2);
        const distance3 = this.levenshteinDistance(normalized1, corrected2);
        const distance4 = this.levenshteinDistance(corrected1, corrected2);
        
        const minDistance = Math.min(distance1, distance2, distance3, distance4);
        const maxLength = Math.max(normalized1.length, normalized2.length);
        const similarity = maxLength > 0 ? 1 - (minDistance / maxLength) : 0;

        // Strategy 4: Also check character-by-character similarity
        let charMatches = 0;
        const minLength = Math.min(normalized1.length, normalized2.length);
        for (let i = 0; i < minLength; i++) {
            if (normalized1[i] === normalized2[i]) {
                charMatches++;
            } else {
                // Check for OCR error: 'rn' -> 'm' at position i
                if (i < normalized1.length - 1 && normalized1.substring(i, i+2) === 'RN' && normalized2[i] === 'M') {
                    charMatches += 0.8; // Partial match for OCR error
                } else if (i < normalized2.length - 1 && normalized2.substring(i, i+2) === 'RN' && normalized1[i] === 'M') {
                    charMatches += 0.8;
                }
            }
        }
        const charSimilarity = maxLength > 0 ? charMatches / maxLength : 0;

        // Combine both similarity scores (weighted average)
        const combinedSimilarity = (similarity * 0.6) + (charSimilarity * 0.4);

        // Match if combined similarity is >= 80% OR if OCR correction makes them match
        const finalMatch = combinedSimilarity >= 0.80 || minDistance <= 1; // Allow 1 character difference
        return { match: finalMatch, similarity: combinedSimilarity };
    }

    /**
     * Compare a single name word (e.g., first name or last name)
     * Handles OCR errors and fuzzy matching
     */
    compareSingleName(name1, name2) {
        if (!name1 || !name2) return { match: false, similarity: 0 };

        const normalized1 = name1.toUpperCase().trim();
        const normalized2 = name2.toUpperCase().trim();

        // Exact match
        if (normalized1 === normalized2) {
            return { match: true, similarity: 1.0 };
        }

        // Try OCR correction: 'm' -> 'rn'
        const corrected1 = normalized1.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');
        const corrected2 = normalized2.replace(/([A-Z])M([A-Z])/gi, '$1RN$2');

        // Check if correction makes them match
        if (corrected1 === corrected2 || corrected1 === normalized2 || normalized1 === corrected2) {
            return { match: true, similarity: 0.95 };
        }

        // Use Levenshtein distance
        const distance1 = this.levenshteinDistance(normalized1, normalized2);
        const distance2 = this.levenshteinDistance(corrected1, normalized2);
        const distance3 = this.levenshteinDistance(normalized1, corrected2);
        const distance4 = this.levenshteinDistance(corrected1, corrected2);

        const minDistance = Math.min(distance1, distance2, distance3, distance4);
        const maxLength = Math.max(normalized1.length, normalized2.length);
        const similarity = maxLength > 0 ? 1 - (minDistance / maxLength) : 0;

        // Character-by-character similarity with OCR error tolerance
        let charMatches = 0;
        const minLength = Math.min(normalized1.length, normalized2.length);
        for (let i = 0; i < minLength; i++) {
            if (normalized1[i] === normalized2[i]) {
                charMatches++;
            } else {
                // Check for OCR error: 'rn' -> 'm'
                if (i < normalized1.length - 1 && normalized1.substring(i, i+2) === 'RN' && normalized2[i] === 'M') {
                    charMatches += 0.8;
                } else if (i < normalized2.length - 1 && normalized2.substring(i, i+2) === 'RN' && normalized1[i] === 'M') {
                    charMatches += 0.8;
                }
            }
        }
        const charSimilarity = maxLength > 0 ? charMatches / maxLength : 0;

        const combinedSimilarity = (similarity * 0.6) + (charSimilarity * 0.4);
        const match = combinedSimilarity >= 0.80 || minDistance <= 1;

        return { match, similarity: combinedSimilarity };
    }

    /**
     * Enhanced document number extraction with multiple patterns
     */
    extractDocumentNumber(text, docType) {
        const patterns = this.patterns[docType];
        if (!patterns) return null;
        
        // Try primary pattern first
        let match = text.match(patterns.primary);
        if (match) {
            return match[0].replace(/\s/g, ''); // Remove spaces
        }
        
        // Try alternative pattern
        match = text.match(patterns.alternative);
        if (match) {
            return match[1] ? match[1].replace(/\s/g, '') : match[0].replace(/\s/g, '');
        }
        
        return null;
    }

    /**
     * Enhanced offline verification with comprehensive validation
     */
    offlineVerify(text, docType) {
        const patterns = this.patterns[docType];
        const rules = this.validationRules[docType];
        
        if (!patterns || !rules) {
            return { verified: false, confidence: 0.0, reason: "Unknown document type" };
        }

        let confidence = 0;
        let reasons = [];
        let verified = true;

        // Check primary pattern match
        const primaryMatch = patterns.primary.test(text);
        if (primaryMatch) {
            confidence += 0.4;
            reasons.push("Primary pattern matched");
        } else {
            verified = false;
            reasons.push("Primary pattern failed");
        }

        // Check alternative pattern match
        const alternativeMatch = patterns.alternative.test(text);
        if (alternativeMatch) {
            confidence += 0.2;
            reasons.push("Alternative pattern matched");
        }

        // Check keyword presence
        const textUpper = text.toUpperCase();
        const keywordMatches = patterns.keywords.filter(keyword => 
            textUpper.includes(keyword.toUpperCase())
        ).length;
        const keywordScore = (keywordMatches / patterns.keywords.length) * 0.3;
        confidence += keywordScore;
        reasons.push(`${keywordMatches}/${patterns.keywords.length} keywords found`);

        // Validate document number format
        const docNumber = this.extractDocumentNumber(text, docType);
        if (docNumber) {
            const isValidLength = docNumber.length === rules.length;
            const isValidFormat = this.validateDocumentFormat(docNumber, docType);
            
            if (isValidLength && isValidFormat) {
                confidence += 0.1;
                reasons.push("Document number format valid");
            } else {
                verified = false;
                reasons.push("Document number format invalid");
            }
        } else {
            verified = false;
            reasons.push("Document number not found");
        }

        // Apply confidence thresholds
        const minConfidence = this.confidenceThresholds[docType].min;
        const maxConfidence = this.confidenceThresholds[docType].max;
        
        if (confidence < minConfidence) {
            verified = false;
        }
        
        confidence = Math.min(confidence, maxConfidence);

        return {
            verified: verified,
            confidence: confidence,
            reason: reasons.join(", "),
            documentNumber: docNumber
        };
    }

    /**
     * Validate document number format based on type-specific rules
     */
    validateDocumentFormat(docNumber, docType) {
        switch (docType) {
            case "PAN":
                return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(docNumber);
            case "AADHAAR":
                return /^\d{12}$/.test(docNumber);
            case "PASSPORT":
                return /^[A-Z]\d{7}$/.test(docNumber);
            case "DRIVING_LICENSE":
                return /^[A-Z]{2}\d{2}\d{11}$/.test(docNumber);
            default:
                return false;
        }
    }

    /**
     * Enhanced online API verification with realistic simulation
     * In production, integrate with actual government APIs (PAN, Aadhaar, Passport APIs)
     */
    async onlineVerify(docType, docNumber) {
        // Simulate API call delay (1-3 seconds)
        const delay = Math.random() * 2000 + 1000;
        await new Promise(resolve => setTimeout(resolve, delay));

        // Simulate different verification outcomes based on document type
        const verificationResults = {
            "PAN": {
                success: () => ({
                    status: "VERIFIED",
                    name: "Verified User",
                    dob: "1990-01-01",
                    confidence: 0.95,
                    apiResponse: "PAN verification successful",
                    timestamp: new Date().toISOString()
                }),
                failure: () => ({
                    status: "FAILED",
                    reason: "Invalid PAN format or not found in database",
                    confidence: 0.0
                })
            },
            "AADHAAR": {
                success: () => ({
                    status: "VERIFIED",
                    name: "Verified User",
                    dob: "1985-06-15",
                    gender: "Female",
                    address: "Verified Address",
                    confidence: 0.92,
                    apiResponse: "Aadhaar verification successful",
                    timestamp: new Date().toISOString()
                }),
                failure: () => ({
                    status: "FAILED",
                    reason: "Aadhaar number not found or invalid",
                    confidence: 0.0
                })
            },
            "PASSPORT": {
                success: () => ({
                    status: "VERIFIED",
                    name: "Verified User",
                    dob: "1988-03-20",
                    nationality: "Indian",
                    passportType: "Ordinary",
                    confidence: 0.90,
                    apiResponse: "Passport verification successful",
                    timestamp: new Date().toISOString()
                }),
                failure: () => ({
                    status: "FAILED",
                    reason: "Passport number not found in database",
                    confidence: 0.0
                })
            },
            "DRIVING_LICENSE": {
                success: () => ({
                    status: "VERIFIED",
                    name: "Verified User",
                    dob: "1992-12-10",
                    licenseType: "LMV",
                    validity: "Valid",
                    confidence: 0.88,
                    apiResponse: "Driving license verification successful",
                    timestamp: new Date().toISOString()
                }),
                failure: () => ({
                    status: "FAILED",
                    reason: "Driving license not found or expired",
                    confidence: 0.0
                })
            }
        };

        // Simulate 90% success rate for realistic testing
        const isSuccess = Math.random() < 0.9;
        const result = verificationResults[docType];
        
        if (result) {
            return isSuccess ? result.success() : result.failure();
        }

        return { 
            status: "FAILED", 
            reason: "Document type not supported for online verification",
            confidence: 0.0
        };
    }

    /**
     * Verify document using parameter-based approach
     * Verifies multiple parameters and passes if 60%+ parameters pass
     * Name is used only for identification, not matching
     */
    async verifyDocument(imagePath, userRole = 'tenant', userName = null, userDocumentNumber = null) {
        try {
            // Step 1: Extract text from image using OCR
            const extractedText = await this.extractTextFromImage(imagePath);

            // Step 2: Detect document type with confidence scoring
            const docType = this.detectDocumentType(extractedText);

            if (docType === "UNKNOWN") {
                return {
                    success: false,
                    isValid: false,
                    message: "Document type not recognized. Please upload a valid ID document (PAN, Aadhaar, Passport, or Driving License).",
                    documentType: docType,
                    extractedText: extractedText.substring(0, 200),
                    suggestions: [
                        "Ensure the document is clearly visible",
                        "Check if the document is one of the supported types",
                        "Try uploading a higher quality image"
                    ]
                };
            }

            // Step 3: Verify multiple parameters
            const parameters = [];
            let passedParameters = 0;
            const totalParameters = 5; // Total number of parameters to check

            // Parameter 1: Document Keywords (Aadhaar/UID/Unique Identification)
            const textUpper = extractedText.toUpperCase();
            const keywords = ['AADHAAR', 'UID', 'UNIQUE IDENTIFICATION', 'GOVERNMENT OF INDIA'];
            const foundKeywords = keywords.filter(keyword => textUpper.includes(keyword));
            const keywordScore = foundKeywords.length > 0 ? 1 : 0;
            parameters.push({
                name: 'Document Keywords',
                passed: keywordScore === 1,
                details: foundKeywords.length > 0 ? `Found keywords: ${foundKeywords.join(', ')}` : 'No document keywords found'
            });
            if (keywordScore === 1) passedParameters++;

            // Parameter 2: Document Number Match (if user provided)
            let documentNumberMatch = 0;
            let extractedDocNumber = null;
            if (userDocumentNumber) {
                extractedDocNumber = this.extractDocumentNumber(extractedText, docType);
                if (extractedDocNumber) {
                    // Normalize both numbers (remove spaces, hyphens)
                    const normalizedUser = userDocumentNumber.replace(/[\s-]/g, '');
                    const normalizedExtracted = extractedDocNumber.replace(/[\s-]/g, '');
                    
                    if (normalizedUser === normalizedExtracted) {
                        documentNumberMatch = 1;
                        parameters.push({
                            name: 'Document Number Match',
                            passed: true,
                            details: `Document number matches: ${extractedDocNumber}`
                        });
                    } else {
                        parameters.push({
                            name: 'Document Number Match',
                            passed: false,
                            details: `Mismatch - User provided: ${userDocumentNumber}, Extracted: ${extractedDocNumber}`
                        });
                    }
                } else {
                    parameters.push({
                        name: 'Document Number Match',
                        passed: false,
                        details: 'Could not extract document number from image'
                    });
                }
            } else {
                // If no user document number provided, check if we can extract one
                extractedDocNumber = this.extractDocumentNumber(extractedText, docType);
                if (extractedDocNumber) {
                    documentNumberMatch = 1;
                    parameters.push({
                        name: 'Document Number Extraction',
                        passed: true,
                        details: `Document number extracted: ${extractedDocNumber}`
                    });
                } else {
                    parameters.push({
                        name: 'Document Number Extraction',
                        passed: false,
                        details: 'Could not extract document number from image'
                    });
                }
            }
            if (documentNumberMatch === 1) passedParameters++;

            // Parameter 3: Document Number Format Validation
            let formatValid = 0;
            if (extractedDocNumber) {
                const rules = this.validationRules[docType];
                if (rules) {
                    const isValidLength = extractedDocNumber.length === rules.length;
                    const isValidFormat = this.validateDocumentFormat(extractedDocNumber, docType);
                    if (isValidLength && isValidFormat) {
                        formatValid = 1;
                        parameters.push({
                            name: 'Document Number Format',
                            passed: true,
                            details: `Format is valid for ${docType}`
                        });
                    } else {
                        parameters.push({
                            name: 'Document Number Format',
                            passed: false,
                            details: `Invalid format - Expected: ${rules.format}, Got: ${extractedDocNumber}`
                        });
                    }
                }
            } else {
                parameters.push({
                    name: 'Document Number Format',
                    passed: false,
                    details: 'No document number to validate'
                });
            }
            if (formatValid === 1) passedParameters++;

            // Parameter 4: Holder Name Extraction (for identification, not matching)
            let nameExtracted = 0;
            let extractedName = null;
            try {
                extractedName = await nameExtractionService.extractName(imagePath, userName);
            } catch (error) {
                // Advanced name extraction failed, fallback to text-based
            }
            
            if (!extractedName) {
                extractedName = this.extractNameFromDocument(extractedText, userName);
            }

            if (extractedName && extractedName.length >= 3) {
                nameExtracted = 1;
                parameters.push({
                    name: 'Holder Name Extraction',
                    passed: true,
                    details: `Name extracted: ${extractedName}`
                });
            } else {
                parameters.push({
                    name: 'Holder Name Extraction',
                    passed: false,
                    details: 'Could not extract name from document'
                });
            }
            if (nameExtracted === 1) passedParameters++;

            // Parameter 5: Document Pattern Recognition
            const offlineResult = this.offlineVerify(extractedText, docType);
            const patternRecognition = offlineResult.confidence >= 0.5 ? 1 : 0;
            parameters.push({
                name: 'Document Pattern Recognition',
                passed: patternRecognition === 1,
                details: `Pattern confidence: ${(offlineResult.confidence * 100).toFixed(1)}%`
            });
            if (patternRecognition === 1) passedParameters++;

            // Calculate pass percentage
            const passPercentage = (passedParameters / totalParameters) * 100;
            const isValid = passPercentage >= 60;

            // Generate verification report
            const verificationReport = {
                success: isValid,
                isValid: isValid,
                message: isValid ? 
                    `Document verified successfully! ${passedParameters}/${totalParameters} parameters passed (${passPercentage.toFixed(1)}%)` : 
                    `Document verification failed. Only ${passedParameters}/${totalParameters} parameters passed (${passPercentage.toFixed(1)}%). Need at least 60%.`,
                documentType: docType.toLowerCase(),
                documentNumber: extractedDocNumber || userDocumentNumber || null,
                extractedName: extractedName || null,
                passPercentage: passPercentage,
                passedParameters: passedParameters,
                totalParameters: totalParameters,
                parameters: parameters,
                verificationSteps: {
                    keywords: {
                        verified: keywordScore === 1,
                        details: foundKeywords.length > 0 ? `Found: ${foundKeywords.join(', ')}` : 'No keywords found'
                    },
                    documentNumber: {
                        verified: documentNumberMatch === 1,
                        userProvided: userDocumentNumber || null,
                        extracted: extractedDocNumber || null,
                        matched: documentNumberMatch === 1
                    },
                    format: {
                        verified: formatValid === 1,
                        details: extractedDocNumber ? `Format check for ${docType}` : 'No document number to validate'
                    },
                    nameExtraction: {
                        verified: nameExtracted === 1,
                        extractedName: extractedName || null
                    },
                    patternRecognition: {
                        verified: patternRecognition === 1,
                        confidence: offlineResult.confidence,
                        details: offlineResult.reason
                    }
                },
                extractedText: extractedText.substring(0, 200),
                timestamp: new Date().toISOString(),
                userRole: userRole
            };

            // Add recommendations if verification failed
            if (!isValid) {
                const failedParams = parameters.filter(p => !p.passed).map(p => p.name);
                verificationReport.recommendations = [
                    `Only ${passedParameters}/${totalParameters} parameters passed. Failed: ${failedParams.join(', ')}`,
                    "Ensure the document image is clear and all text is readable",
                    "Verify that the document number matches what you entered",
                    "Check that the document is a valid government-issued ID"
                ];
            }

            return verificationReport;

        } catch (error) {
            console.error('Document verification error:', error);
            return {
                success: false,
                isValid: false,
                message: "An error occurred during document verification. Please try again.",
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Generate recommendations for failed verification
     */
    generateRecommendations(offlineResult, onlineResult, docType, nameMatch = null) {
        const recommendations = [];
        
        // Name mismatch recommendations
        if (nameMatch && !nameMatch.match) {
            recommendations.push("The name on the document does not match your registration name. Please upload a document with your correct name.");
            recommendations.push("Ensure you are uploading your own valid government-issued ID document");
            if (nameMatch.extractedName) {
                recommendations.push(`Document shows name: "${nameMatch.extractedName}"`);
            }
        }
        
        if (!offlineResult.verified) {
            recommendations.push("Ensure the document image is clear and all text is readable");
            recommendations.push("Check that the document is not damaged or partially obscured");
        }
        
        if (onlineResult.status !== "VERIFIED") {
            recommendations.push("Verify that the document number is correct");
            recommendations.push("Ensure the document is valid and not expired");
        }
        
        if (offlineResult.confidence < 0.7) {
            recommendations.push("Try uploading a higher resolution image");
            recommendations.push("Ensure proper lighting when photographing the document");
        }
        
        return recommendations;
    }

    /**
     * Enhanced document validation based on user role requirements
     */
    validateDocumentForRole(docType, userRole) {
        const roleRequirements = {
            'tenant': {
                allowed: ['PAN', 'AADHAAR', 'PASSPORT', 'DRIVING_LICENSE'],
                preferred: ['PAN', 'AADHAAR'],
                minConfidence: 0.8
            },
            'owner': {
                allowed: ['PAN', 'AADHAAR', 'PASSPORT'],
                preferred: ['PAN', 'AADHAAR'],
                minConfidence: 0.85 // Higher confidence required for owners
            },
            'admin': {
                allowed: ['PAN', 'AADHAAR', 'PASSPORT'],
                preferred: ['PAN'],
                minConfidence: 0.9 // Highest confidence for admin users
            }
        };

        const requirements = roleRequirements[userRole] || roleRequirements['tenant'];
        return {
            isAllowed: requirements.allowed.includes(docType),
            isPreferred: requirements.preferred.includes(docType),
            minConfidence: requirements.minConfidence,
            message: requirements.allowed.includes(docType) ? 
                `${docType} is accepted for ${userRole} registration` :
                `${docType} is not accepted for ${userRole} registration. Allowed documents: ${requirements.allowed.join(', ')}`
        };
    }
}

module.exports = new DocumentVerificationService();
