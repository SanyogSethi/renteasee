const documentVerificationService = require('../services/documentVerificationService');

/**
 * Verify government-issued documents using enhanced verification service
 * This is a wrapper function to maintain backward compatibility
 */
async function verifyDocument(documentPath, userRole = 'tenant', userName = null, userDocumentNumber = null) {
  try {
    const result = await documentVerificationService.verifyDocument(documentPath, userRole, userName, userDocumentNumber);
    
    // Map the enhanced service response to the expected format
    return {
      isValid: result.isValid || result.success || false,
      documentType: result.documentType || 'unknown',
      confidence: result.passPercentage ? result.passPercentage.toFixed(2) : (result.confidence || '0.00'),
      message: result.message || 'Document verification completed',
      documentNumber: result.documentNumber || null,
      overallConfidence: result.passPercentage ? result.passPercentage / 100 : (result.overallConfidence || 0),
      verificationSteps: result.verificationSteps || null,
      recommendations: result.recommendations || null,
      nameMatch: result.extractedName ? {
        match: true,
        similarity: 1.0,
        extractedName: result.extractedName
      } : null,
      parameters: result.parameters || null,
      passedParameters: result.passedParameters || 0,
      totalParameters: result.totalParameters || 5,
      passPercentage: result.passPercentage || 0
    };
  } catch (error) {
    console.error('Document verification error:', error);
    return {
      isValid: false,
      documentType: 'unknown',
      confidence: '0.00',
      message: `Verification failed: ${error.message}`
    };
  }
}

module.exports = { verifyDocument };