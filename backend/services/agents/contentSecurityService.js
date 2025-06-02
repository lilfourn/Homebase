const crypto = require('crypto');

class ContentSecurityService {
  constructor() {
    // Patterns that might indicate malicious content
    this.suspiciousPatterns = [
      // Script injections
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers like onclick=
      
      // Common exploits
      /eval\s*\(/gi,
      /document\.write/gi,
      /\.exec\s*\(/gi,
      /\.system\s*\(/gi,
      
      // Base64 encoded suspicious content
      /data:.*base64/gi,
      
      // SQL injection patterns
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      
      // Path traversal
      /\.\.[\/\\]/g,
      
      // Command injection
      /;\s*(rm|del|format|shutdown|reboot)/gi,
      /&&\s*(rm|del|format|shutdown|reboot)/gi,
      /\|\s*(rm|del|format|shutdown|reboot)/gi
    ];

    // Academic integrity keywords to flag
    this.academicIntegrityKeywords = [
      'essay mill',
      'homework service',
      'write my essay',
      'do my homework',
      'assignment for sale',
      'buy essay',
      'plagiarism free guaranteed',
      'ghostwriter',
      'paper writing service'
    ];

    // Maximum allowed file sizes by type
    this.maxFileSizes = {
      'application/pdf': 50 * 1024 * 1024, // 50MB
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 25 * 1024 * 1024, // 25MB
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 100 * 1024 * 1024, // 100MB
      'text/plain': 10 * 1024 * 1024, // 10MB
      'text/markdown': 10 * 1024 * 1024, // 10MB
      'image/png': 25 * 1024 * 1024, // 25MB
      'image/jpeg': 25 * 1024 * 1024, // 25MB
      'image/jpg': 25 * 1024 * 1024 // 25MB
    };
  }

  async validateFile(file) {
    const validationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      riskScore: 0
    };

    try {
      // Check file size
      const sizeCheck = this.checkFileSize(file);
      if (!sizeCheck.valid) {
        validationResult.errors.push(sizeCheck.error);
        validationResult.isValid = false;
      }

      // Check file type
      const typeCheck = this.checkFileType(file);
      if (!typeCheck.valid) {
        validationResult.errors.push(typeCheck.error);
        validationResult.isValid = false;
      }

      // Check filename
      const nameCheck = this.checkFileName(file);
      if (!nameCheck.valid) {
        validationResult.warnings.push(nameCheck.warning);
        validationResult.riskScore += nameCheck.risk;
      }

      // If file has content, check for suspicious patterns
      if (file.content || file.buffer) {
        const contentCheck = await this.checkContent(file);
        if (contentCheck.suspicious) {
          validationResult.warnings.push(...contentCheck.warnings);
          validationResult.riskScore += contentCheck.risk;
        }

        // Check for academic integrity issues
        const integrityCheck = this.checkAcademicIntegrity(file);
        if (integrityCheck.flagged) {
          validationResult.warnings.push(...integrityCheck.warnings);
          validationResult.riskScore += integrityCheck.risk;
        }
      }

      // Calculate final risk assessment
      validationResult.riskLevel = this.calculateRiskLevel(validationResult.riskScore);

    } catch (error) {
      console.error('[ContentSecurityService] Validation error:', error);
      validationResult.errors.push(`Validation error: ${error.message}`);
      validationResult.isValid = false;
    }

    return validationResult;
  }

  checkFileSize(file) {
    const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
    const maxSize = this.maxFileSizes[file.mimeType] || 10 * 1024 * 1024; // Default 10MB

    if (fileSize > maxSize) {
      return {
        valid: false,
        error: `File size (${this.formatBytes(fileSize)}) exceeds maximum allowed size (${this.formatBytes(maxSize)}) for ${file.mimeType}`
      };
    }

    return { valid: true };
  }

  checkFileType(file) {
    const allowedTypes = Object.keys(this.maxFileSizes);
    
    if (!allowedTypes.includes(file.mimeType)) {
      return {
        valid: false,
        error: `File type ${file.mimeType} is not supported`
      };
    }

    // Additional validation for specific types
    if (file.mimeType.includes('image')) {
      // Could add image-specific validation here
    }

    return { valid: true };
  }

  checkFileName(file) {
    const fileName = file.fileName || file.name || '';
    
    // Check for suspicious file names
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    const hasSuspiciousExtension = suspiciousExtensions.some(ext => 
      fileName.toLowerCase().endsWith(ext)
    );

    if (hasSuspiciousExtension) {
      return {
        valid: false,
        warning: `Suspicious file extension detected in ${fileName}`,
        risk: 50
      };
    }

    // Check for hidden files
    if (fileName.startsWith('.')) {
      return {
        valid: true,
        warning: `Hidden file detected: ${fileName}`,
        risk: 10
      };
    }

    // Check for overly long filenames
    if (fileName.length > 255) {
      return {
        valid: false,
        warning: `File name too long: ${fileName.substring(0, 50)}...`,
        risk: 20
      };
    }

    return { valid: true };
  }

  async checkContent(file) {
    const result = {
      suspicious: false,
      warnings: [],
      risk: 0
    };

    try {
      let content = '';
      
      if (file.content && typeof file.content === 'string') {
        content = file.content;
      } else if (file.buffer) {
        content = file.buffer.toString('utf-8');
      }

      if (!content) {
        return result;
      }

      // Check for suspicious patterns
      for (const pattern of this.suspiciousPatterns) {
        const matches = content.match(pattern);
        if (matches && matches.length > 0) {
          result.suspicious = true;
          result.warnings.push(`Suspicious pattern detected: ${pattern.source}`);
          result.risk += 30;
        }
      }

      // Check for excessive special characters (might indicate encoded/obfuscated content)
      const specialCharRatio = this.calculateSpecialCharRatio(content);
      if (specialCharRatio > 0.5) {
        result.warnings.push('High ratio of special characters detected');
        result.risk += 20;
      }

      // Check for potential encoded content
      if (this.detectEncodedContent(content)) {
        result.warnings.push('Potentially encoded content detected');
        result.risk += 25;
      }

    } catch (error) {
      console.error('[ContentSecurityService] Content check error:', error);
      result.warnings.push('Unable to fully analyze content');
      result.risk += 10;
    }

    return result;
  }

  checkAcademicIntegrity(file) {
    const result = {
      flagged: false,
      warnings: [],
      risk: 0
    };

    try {
      let content = '';
      
      if (file.content && typeof file.content === 'string') {
        content = file.content.toLowerCase();
      } else if (file.buffer) {
        content = file.buffer.toString('utf-8').toLowerCase();
      }

      if (!content) {
        return result;
      }

      // Check for academic integrity keywords
      for (const keyword of this.academicIntegrityKeywords) {
        if (content.includes(keyword.toLowerCase())) {
          result.flagged = true;
          result.warnings.push(`Academic integrity concern: "${keyword}" detected`);
          result.risk += 40;
        }
      }

      // Check for excessive similarity markers (might indicate copied content)
      const quotationRatio = (content.match(/["']/g) || []).length / content.length;
      if (quotationRatio > 0.1) {
        result.warnings.push('High quotation density detected - ensure proper citations');
        result.risk += 15;
      }

    } catch (error) {
      console.error('[ContentSecurityService] Academic integrity check error:', error);
    }

    return result;
  }

  calculateSpecialCharRatio(content) {
    const specialChars = content.match(/[^a-zA-Z0-9\s]/g) || [];
    return specialChars.length / content.length;
  }

  detectEncodedContent(content) {
    // Check for base64 patterns
    const base64Pattern = /^[A-Za-z0-9+/]{50,}={0,2}$/gm;
    
    // Check for hex encoding
    const hexPattern = /^[0-9a-fA-F]{50,}$/gm;
    
    return base64Pattern.test(content) || hexPattern.test(content);
  }

  calculateRiskLevel(riskScore) {
    if (riskScore >= 100) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    if (riskScore >= 20) return 'low';
    return 'safe';
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async scanMultipleFiles(files) {
    const results = {
      totalFiles: files.length,
      validFiles: [],
      invalidFiles: [],
      warnings: [],
      overallRisk: 'safe'
    };

    let maxRiskScore = 0;

    for (const file of files) {
      const validation = await this.validateFile(file);
      
      if (validation.isValid) {
        results.validFiles.push({
          fileName: file.fileName,
          riskLevel: validation.riskLevel,
          warnings: validation.warnings
        });
      } else {
        results.invalidFiles.push({
          fileName: file.fileName,
          errors: validation.errors
        });
      }

      if (validation.warnings.length > 0) {
        results.warnings.push(...validation.warnings.map(w => `${file.fileName}: ${w}`));
      }

      maxRiskScore = Math.max(maxRiskScore, validation.riskScore);
    }

    results.overallRisk = this.calculateRiskLevel(maxRiskScore);
    
    return results;
  }

  generateSecurityReport(scanResults) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScanned: scanResults.totalFiles,
        passed: scanResults.validFiles.length,
        failed: scanResults.invalidFiles.length,
        overallRisk: scanResults.overallRisk
      },
      details: {
        validFiles: scanResults.validFiles,
        invalidFiles: scanResults.invalidFiles,
        warnings: scanResults.warnings
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (scanResults.overallRisk === 'high' || scanResults.overallRisk === 'critical') {
      report.recommendations.push('Review files carefully before processing');
      report.recommendations.push('Consider requesting files in a different format');
    }

    if (scanResults.warnings.some(w => w.includes('academic integrity'))) {
      report.recommendations.push('Ensure all content adheres to academic integrity policies');
      report.recommendations.push('Verify proper citations are included');
    }

    return report;
  }
}

module.exports = new ContentSecurityService();