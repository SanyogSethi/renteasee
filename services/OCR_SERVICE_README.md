# Enhanced OCR Service for Document Verification

This service provides production-ready OCR capabilities for document verification, with multiple engine options.

## Features

- ✅ **Multiple OCR Engines**: Tesseract.js, Google Cloud Vision, AWS Textract, or Hybrid mode
- ✅ **Image Preprocessing**: Automatic image enhancement for better OCR accuracy
- ✅ **Confidence Scoring**: Returns confidence metrics for verification decisions
- ✅ **Error Handling**: Graceful fallbacks and helpful error messages
- ✅ **Offline Support**: Tesseract.js works completely offline

## Quick Start

### Option 1: Tesseract.js (Recommended for Free/Offline Use)

```bash
npm install tesseract.js
```

**Environment Variables (.env):**
```env
OCR_ENGINE=tesseract
OCR_PREPROCESSING=true
```

### Option 2: Google Cloud Vision API (High Accuracy)

```bash
npm install @google-cloud/vision
```

**Setup:**
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Set environment variable:
```env
OCR_ENGINE=google
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

### Option 3: AWS Textract (High Accuracy)

```bash
npm install @aws-sdk/client-textract
```

**Setup:**
```env
OCR_ENGINE=aws
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

### Option 4: Hybrid Mode (Best of Both Worlds)

Uses Tesseract first, falls back to cloud OCR if confidence is low:

```env
OCR_ENGINE=hybrid
# Configure either Google or AWS credentials for fallback
```

## Usage Example

### Basic Text Extraction

```javascript
const documentOCRService = require('./services/documentOCRService');

// Simple text extraction
const extractedText = await documentOCRService.extractTextFromImage('/path/to/document.jpg');
console.log(extractedText);
```

### Extraction with Metadata

```javascript
// Get text with confidence scores and engine info
const result = await documentOCRService.extractTextWithMetadata('/path/to/document.jpg');

console.log('Extracted Text:', result.text);
console.log('Confidence:', result.confidence); // 0-1 scale
console.log('Engine Used:', result.engine);
```

## Integration with Existing Code

Replace the `extractTextFromImage` method in `documentVerificationService.js`:

```javascript
// OLD (Mock OCR):
const extractedText = await this.extractTextFromImage(imagePath);

// NEW (Real OCR):
const documentOCRService = require('./documentOCRService');
const extractedText = await documentOCRService.extractTextFromImage(imagePath);
```

## Image Preprocessing

The service automatically preprocesses images to improve OCR accuracy:
- Converts to grayscale
- Enhances contrast
- Sharpens text edges
- Resizes for optimal OCR (max 2000px width)

To disable preprocessing:
```env
OCR_PREPROCESSING=false
```

## Engine Comparison

| Engine | Accuracy | Speed | Cost | Offline | Setup Difficulty |
|--------|----------|-------|------|---------|------------------|
| **Tesseract.js** | Good (85-90%) | Fast | Free | ✅ Yes | Easy ⭐ |
| **Google Vision** | Excellent (95%+) | Medium | Paid | ❌ No | Medium ⭐⭐ |
| **AWS Textract** | Excellent (95%+) | Medium | Paid | ❌ No | Medium ⭐⭐ |
| **Hybrid** | Best | Variable | Variable | Partial | Medium ⭐⭐ |

## Cost Estimates

### Tesseract.js
- **Free** - No API costs

### Google Cloud Vision API
- **$1.50 per 1,000 images** (first 1,000/month free)
- Best for: High-volume, production use

### AWS Textract
- **$1.50 per 1,000 pages** (first 1,000/month free)
- Best for: AWS-integrated applications

## Performance Tips

1. **Preprocessing**: Enabled by default, improves accuracy by 10-15%
2. **Image Quality**: Upload clear, high-resolution images (min 1000px width recommended)
3. **File Format**: PNG or JPEG works best
4. **Caching**: Consider caching OCR results for same documents

## Troubleshooting

### "Module not found" Error
- Install the required package for your chosen engine
- See Quick Start section above

### Low OCR Accuracy
- Enable preprocessing (default: enabled)
- Use higher resolution images
- Try hybrid mode for better results
- Consider cloud OCR for critical documents

### Google Vision / AWS Errors
- Verify credentials are set correctly
- Check API quotas and billing
- Ensure image format is supported

## Recommendations

- **Development/Testing**: Use **Tesseract.js** (free, offline)
- **Production (Low Volume)**: Use **Tesseract.js** or **Hybrid**
- **Production (High Volume)**: Use **Google Vision** or **AWS Textract**
- **Budget-Conscious**: Start with **Tesseract.js**, upgrade if needed

## Next Steps

1. Choose your OCR engine based on requirements
2. Install the required package(s)
3. Set environment variables
4. Replace `extractTextFromImage` in `documentVerificationService.js`
5. Test with sample documents
6. Monitor accuracy and adjust confidence thresholds if needed

