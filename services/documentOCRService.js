const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * Enhanced OCR Service for Document Verification
 * 
 * This service provides multiple OCR options:
 * 1. Tesseract.js (Primary) - Free, offline, open-source
 * 2. Google Cloud Vision API (Optional) - High accuracy, paid
 * 3. AWS Textract (Optional) - High accuracy, paid
 * 
 * For production use, you'll need to install one of these:
 * - npm install tesseract.js (for Tesseract)
 * - npm install @google-cloud/vision (for Google Vision)
 * - npm install @aws-sdk/client-textract (for AWS Textract)
 */

class DocumentOCRService {
    constructor() {
        this.ocrEngine = process.env.OCR_ENGINE || 'tesseract'; // 'tesseract', 'google', 'aws', 'hybrid'
        this.usePreprocessing = process.env.OCR_PREPROCESSING !== 'false'; // Enable by default
        this.tesseractWorker = null;
        this.initialized = false;
    }

    /**
     * Initialize OCR engine based on configuration
     */
    async initialize() {
        if (this.initialized) return;

        try {
            switch (this.ocrEngine) {
                case 'tesseract':
                    // Lazy loading - will be initialized on first use
                    console.log('OCR Engine: Tesseract.js (will be loaded on first use)');
                    break;
                
                case 'google':
                    // Google Vision API - requires service account
                    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable not set');
                    }
                    console.log('OCR Engine: Google Cloud Vision API');
                    break;
                
                case 'aws':
                    // AWS Textract - requires AWS credentials
                    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
                        throw new Error('AWS credentials not configured');
                    }
                    console.log('OCR Engine: AWS Textract');
                    break;
                
                case 'hybrid':
                    console.log('OCR Engine: Hybrid (Tesseract + Cloud APIs)');
                    break;
                
                default:
                    console.warn(`Unknown OCR engine: ${this.ocrEngine}, falling back to Tesseract`);
                    this.ocrEngine = 'tesseract';
            }
            
            this.initialized = true;
        } catch (error) {
            console.error('OCR initialization error:', error);
            // Fallback to Tesseract if initialization fails
            this.ocrEngine = 'tesseract';
        }
    }

    /**
     * Preprocess image for better OCR accuracy
     * - Convert to grayscale
     * - Enhance contrast
     * - Increase sharpness
     * - Resize if needed
     */
    async preprocessImage(imagePath) {
        if (!this.usePreprocessing) {
            return imagePath;
        }

        try {
            const outputPath = imagePath.replace(path.extname(imagePath), '_processed' + path.extname(imagePath));
            
            await sharp(imagePath)
                .greyscale() // Convert to grayscale for better OCR
                .normalize() // Enhance contrast
                .sharpen({ sigma: 1.2, flat: 1, jagged: 2 }) // Sharpen text edges
                .resize(2000, null, { // Upscale for better OCR (max width 2000px)
                    withoutEnlargement: false,
                    fit: 'inside'
                })
                .toFile(outputPath);

            console.log('Image preprocessed successfully');
            return outputPath;
        } catch (error) {
            console.error('Image preprocessing error:', error);
            // Return original if preprocessing fails
            return imagePath;
        }
    }

    /**
     * Cleanup processed image file
     */
    async cleanupProcessedImage(processedPath, originalPath) {
        if (processedPath !== originalPath) {
            try {
                await fs.unlink(processedPath);
            } catch (error) {
                console.error('Error cleaning up processed image:', error);
            }
        }
    }

    /**
     * Extract text using Tesseract.js (Free, Offline)
     * Install: npm install tesseract.js
     */
    async extractTextWithTesseract(imagePath) {
        try {
            // Dynamic import to handle optional dependency
            const Tesseract = require('tesseract.js');
            
            const { data: { text, confidence } } = await Tesseract.recognize(
                imagePath,
                'eng', // English language
                {
                    logger: (info) => {
                        // Log progress in development
                        if (process.env.NODE_ENV === 'development') {
                            if (info.status === 'recognizing text') {
                                console.log(`OCR Progress: ${Math.round(info.progress * 100)}%`);
                            }
                        }
                    }
                }
            );

            console.log(`Tesseract OCR completed. Confidence: ${confidence.toFixed(2)}%`);
            return {
                text: text.trim(),
                confidence: confidence / 100, // Convert to 0-1 scale
                engine: 'tesseract'
            };
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error(
                    'Tesseract.js not installed. Run: npm install tesseract.js\n' +
                    'Or use a cloud OCR service by setting OCR_ENGINE=google or OCR_ENGINE=aws'
                );
            }
            console.error('Tesseract OCR error:', error);
            throw new Error(`Tesseract OCR failed: ${error.message}`);
        }
    }

    /**
     * Extract text using Google Cloud Vision API (High Accuracy, Paid)
     * Install: npm install @google-cloud/vision
     * Setup: Set GOOGLE_APPLICATION_CREDENTIALS environment variable
     */
    async extractTextWithGoogleVision(imagePath) {
        try {
            const vision = require('@google-cloud/vision');
            const client = new vision.ImageAnnotatorClient();

            const [result] = await client.textDetection(imagePath);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                return {
                    text: '',
                    confidence: 0,
                    engine: 'google-vision',
                    message: 'No text detected in image'
                };
            }

            // First element contains full text
            const fullText = detections[0].description || '';
            // Average confidence from all detections
            const avgConfidence = detections.length > 1 
                ? detections.slice(1).reduce((sum, det) => {
                    const confidence = det.confidence || 0;
                    return sum + confidence;
                }, 0) / (detections.length - 1)
                : 0.9; // Default confidence if not available

            console.log(`Google Vision OCR completed. Confidence: ${(avgConfidence * 100).toFixed(2)}%`);
            return {
                text: fullText.trim(),
                confidence: avgConfidence,
                engine: 'google-vision',
                detections: detections.length
            };
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error(
                    'Google Cloud Vision not installed. Run: npm install @google-cloud/vision\n' +
                    'And set GOOGLE_APPLICATION_CREDENTIALS environment variable'
                );
            }
            console.error('Google Vision OCR error:', error);
            throw new Error(`Google Vision OCR failed: ${error.message}`);
        }
    }

    /**
     * Extract text using AWS Textract (High Accuracy, Paid)
     * Install: npm install @aws-sdk/client-textract
     * Setup: Configure AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
     */
    async extractTextWithAWSTextract(imagePath) {
        try {
            const { TextractClient, DetectDocumentTextCommand } = require('@aws-sdk/client-textract');
            const client = new TextractClient({
                region: process.env.AWS_REGION || 'us-east-1'
            });

            const imageBuffer = await fs.readFile(imagePath);
            const command = new DetectDocumentTextCommand({
                Document: {
                    Bytes: imageBuffer
                }
            });

            const response = await client.send(command);
            
            if (!response.Blocks || response.Blocks.length === 0) {
                return {
                    text: '',
                    confidence: 0,
                    engine: 'aws-textract',
                    message: 'No text detected in image'
                };
            }

            // Extract text from all blocks
            const textBlocks = response.Blocks
                .filter(block => block.BlockType === 'LINE')
                .map(block => block.Text)
                .join('\n');

            // Calculate average confidence
            const confidenceBlocks = response.Blocks
                .filter(block => block.Confidence !== undefined);
            const avgConfidence = confidenceBlocks.length > 0
                ? confidenceBlocks.reduce((sum, block) => sum + (block.Confidence || 0), 0) / confidenceBlocks.length
                : 0.9;

            console.log(`AWS Textract OCR completed. Confidence: ${(avgConfidence).toFixed(2)}%`);
            return {
                text: textBlocks.trim(),
                confidence: avgConfidence / 100, // Convert to 0-1 scale
                engine: 'aws-textract',
                blocks: response.Blocks.length
            };
        } catch (error) {
            if (error.code === 'MODULE_NOT_FOUND') {
                throw new Error(
                    'AWS Textract SDK not installed. Run: npm install @aws-sdk/client-textract\n' +
                    'And configure AWS credentials'
                );
            }
            console.error('AWS Textract OCR error:', error);
            throw new Error(`AWS Textract OCR failed: ${error.message}`);
        }
    }

    /**
     * Hybrid OCR: Use Tesseract first, fallback to cloud if confidence is low
     */
    async extractTextWithHybrid(imagePath) {
        try {
            // Try Tesseract first
            const tesseractResult = await this.extractTextWithTesseract(imagePath);
            
            // If confidence is good enough, return it
            if (tesseractResult.confidence >= 0.7) {
                return tesseractResult;
            }

            console.log(`Tesseract confidence (${tesseractResult.confidence.toFixed(2)}) is low, trying cloud OCR...`);
            
            // Fallback to cloud OCR (prefer Google, then AWS)
            try {
                if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
                    return await this.extractTextWithGoogleVision(imagePath);
                } else if (process.env.AWS_ACCESS_KEY_ID) {
                    return await this.extractTextWithAWSTextract(imagePath);
                }
            } catch (cloudError) {
                console.warn('Cloud OCR failed, using Tesseract result:', cloudError.message);
            }

            // Return Tesseract result even if confidence is low
            return tesseractResult;
        } catch (error) {
            throw new Error(`Hybrid OCR failed: ${error.message}`);
        }
    }

    /**
     * Main method to extract text from image
     * Handles preprocessing and routes to appropriate OCR engine
     */
    async extractTextFromImage(imagePath) {
        await this.initialize();

        let processedImagePath = imagePath;
        let shouldCleanup = false;

        try {
            // Preprocess image for better OCR results
            processedImagePath = await this.preprocessImage(imagePath);
            shouldCleanup = (processedImagePath !== imagePath);

            let result;

            // Route to appropriate OCR engine
            switch (this.ocrEngine) {
                case 'tesseract':
                    result = await this.extractTextWithTesseract(processedImagePath);
                    break;
                
                case 'google':
                    result = await this.extractTextWithGoogleVision(processedImagePath);
                    break;
                
                case 'aws':
                    result = await this.extractTextWithAWSTextract(processedImagePath);
                    break;
                
                case 'hybrid':
                    result = await this.extractTextWithHybrid(processedImagePath);
                    break;
                
                default:
                    // Fallback to Tesseract
                    result = await this.extractTextWithTesseract(processedImagePath);
            }

            // Log extraction summary
            console.log(`OCR Extraction Summary:`);
            console.log(`  Engine: ${result.engine}`);
            console.log(`  Confidence: ${(result.confidence * 100).toFixed(2)}%`);
            console.log(`  Text Length: ${result.text.length} characters`);
            console.log(`  Preview: ${result.text.substring(0, 100)}...`);

            return result.text;
        } catch (error) {
            console.error('OCR extraction error:', error);
            
            // Provide helpful error message
            if (error.message.includes('not installed')) {
                throw new Error(
                    `OCR Engine Error: ${error.message}\n\n` +
                    `To fix this:\n` +
                    `1. For Tesseract: npm install tesseract.js\n` +
                    `2. For Google Vision: npm install @google-cloud/vision\n` +
                    `3. For AWS Textract: npm install @aws-sdk/client-textract\n` +
                    `4. Set OCR_ENGINE in .env file (tesseract, google, aws, or hybrid)`
                );
            }
            
            throw new Error(`Failed to extract text from document: ${error.message}`);
        } finally {
            // Cleanup processed image if it was created
            if (shouldCleanup) {
                await this.cleanupProcessedImage(processedImagePath, imagePath);
            }
        }
    }

    /**
     * Extract text with metadata (includes confidence scores, engine info)
     */
    async extractTextWithMetadata(imagePath) {
        await this.initialize();

        let processedImagePath = imagePath;
        let shouldCleanup = false;

        try {
            processedImagePath = await this.preprocessImage(imagePath);
            shouldCleanup = (processedImagePath !== imagePath);

            let result;

            switch (this.ocrEngine) {
                case 'tesseract':
                    result = await this.extractTextWithTesseract(processedImagePath);
                    break;
                case 'google':
                    result = await this.extractTextWithGoogleVision(processedImagePath);
                    break;
                case 'aws':
                    result = await this.extractTextWithAWSTextract(processedImagePath);
                    break;
                case 'hybrid':
                    result = await this.extractTextWithHybrid(processedImagePath);
                    break;
                default:
                    result = await this.extractTextWithTesseract(processedImagePath);
            }

            return result;
        } catch (error) {
            console.error('OCR extraction error:', error);
            throw error;
        } finally {
            if (shouldCleanup) {
                await this.cleanupProcessedImage(processedImagePath, imagePath);
            }
        }
    }
}

// Export singleton instance
module.exports = new DocumentOCRService();

