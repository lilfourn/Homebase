const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);
const contentSecurityService = require('./agents/contentSecurityService');

class FileProcessingService {
  constructor() {
    this.supportedMimeTypes = {
      'application/pdf': this.processPDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processDOCX.bind(this),
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': this.processPPTX.bind(this),
      'text/plain': this.processText.bind(this),
      'text/markdown': this.processText.bind(this),
      'image/png': this.processImage.bind(this),
      'image/jpeg': this.processImage.bind(this),
      'image/jpg': this.processImage.bind(this),
      'application/javascript': this.processText.bind(this),
      'text/javascript': this.processText.bind(this),
      'application/json': this.processText.bind(this),
      'text/css': this.processText.bind(this),
      'text/html': this.processText.bind(this),
      'application/x-python': this.processText.bind(this),
      'text/x-python': this.processText.bind(this),
      'text/x-java': this.processText.bind(this),
      'text/x-c': this.processText.bind(this),
      'text/x-c++': this.processText.bind(this)
    };

    this.MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    this.MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB
    this.CHUNK_SIZE = 3000; // tokens per chunk (approximate)
    this.CHUNK_OVERLAP = 200; // tokens overlap between chunks
  }

  async processFiles(files, options = {}) {
    const { 
      validateSizes = true, 
      extractMetadata = true,
      deduplicateContent = true,
      chunkContent = true,
      maxChunkSize = this.CHUNK_SIZE,
      performSecurityScan = true
    } = options;

    try {
      if (validateSizes) {
        this.validateFileSizes(files);
      }

      // Perform security scan on all files
      let securityReport = null;
      if (performSecurityScan) {
        securityReport = await contentSecurityService.scanMultipleFiles(files);
        console.log('[FileProcessingService] Security scan complete:', securityReport.summary);
        
        // Stop processing if critical risk detected
        if (securityReport.overallRisk === 'critical') {
          throw new Error('Security risk detected. Files cannot be processed.');
        }
      }

      const processedFiles = [];
      const contentHashes = new Set();

      for (const file of files) {
        try {
          console.log(`[FileProcessingService] Processing file: ${file.fileName} (${file.mimeType})`);
          
          let processedFile = await this.processFile(file);
          
          if (extractMetadata) {
            processedFile.metadata = this.extractMetadata(processedFile);
          }

          if (deduplicateContent) {
            const contentHash = this.generateContentHash(processedFile.content);
            if (contentHashes.has(contentHash)) {
              console.log(`[FileProcessingService] Duplicate content detected for: ${file.fileName}`);
              processedFile.isDuplicate = true;
            } else {
              contentHashes.add(contentHash);
              processedFile.isDuplicate = false;
            }
          }

          if (chunkContent && processedFile.content.length > maxChunkSize) {
            processedFile.chunks = this.chunkText(processedFile.content, maxChunkSize);
          }

          processedFiles.push(processedFile);
        } catch (error) {
          console.error(`[FileProcessingService] Error processing file ${file.fileName}:`, error);
          processedFiles.push({
            ...file,
            content: '',
            error: error.message,
            processed: false
          });
        }
      }

      return {
        files: processedFiles,
        stats: {
          totalFiles: files.length,
          successfullyProcessed: processedFiles.filter(f => f.processed !== false).length,
          duplicates: processedFiles.filter(f => f.isDuplicate).length,
          errors: processedFiles.filter(f => f.error).length,
          totalContent: processedFiles.reduce((sum, f) => sum + (f.content?.length || 0), 0)
        },
        securityReport: securityReport ? contentSecurityService.generateSecurityReport(securityReport) : null
      };
    } catch (error) {
      console.error('[FileProcessingService] Error processing files:', error);
      throw error;
    }
  }

  async processFile(file) {
    const processor = this.supportedMimeTypes[file.mimeType];
    
    if (!processor) {
      throw new Error(`Unsupported file type: ${file.mimeType}`);
    }

    const content = await processor(file);
    
    return {
      ...file,
      content,
      processed: true,
      processedAt: new Date().toISOString(),
      contentLength: content.length,
      wordCount: this.countWords(content),
      lineCount: this.countLines(content)
    };
  }

  async processPDF(file) {
    try {
      let buffer;
      
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path) {
        buffer = await fs.readFile(file.path);
      } else if (file.content) {
        buffer = Buffer.from(file.content, 'base64');
      } else {
        throw new Error('No file content available');
      }

      const data = await pdfParse(buffer, {
        max: 0, // no page limit
        version: 'v2.0.550'
      });

      let extractedText = data.text;

      // Clean up the text
      extractedText = this.cleanText(extractedText);

      // Extract additional metadata
      const metadata = {
        pages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        version: data.version
      };

      console.log(`[FileProcessingService] Extracted ${extractedText.length} characters from PDF`);
      
      return extractedText;
    } catch (error) {
      console.error('[FileProcessingService] PDF processing error:', error);
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
  }

  async processDOCX(file) {
    try {
      let buffer;
      
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path) {
        buffer = await fs.readFile(file.path);
      } else if (file.content) {
        buffer = Buffer.from(file.content, 'base64');
      } else {
        throw new Error('No file content available');
      }

      const result = await mammoth.extractRawText({ buffer });
      
      if (result.messages && result.messages.length > 0) {
        console.warn('[FileProcessingService] DOCX conversion warnings:', result.messages);
      }

      const extractedText = this.cleanText(result.value);
      
      console.log(`[FileProcessingService] Extracted ${extractedText.length} characters from DOCX`);
      
      return extractedText;
    } catch (error) {
      console.error('[FileProcessingService] DOCX processing error:', error);
      throw new Error(`Failed to process DOCX: ${error.message}`);
    }
  }

  async processPPTX(file) {
    try {
      // PPTX processing is complex, using a simple text extraction approach
      // In production, consider using a more sophisticated library like python-pptx via a microservice
      
      let buffer;
      
      if (file.buffer) {
        buffer = file.buffer;
      } else if (file.path) {
        buffer = await fs.readFile(file.path);
      } else if (file.content) {
        buffer = Buffer.from(file.content, 'base64');
      } else {
        throw new Error('No file content available');
      }

      // For now, we'll use mammoth which can extract some text from PPTX
      // This is not ideal but provides basic functionality
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = this.cleanText(result.value);
      
      console.log(`[FileProcessingService] Extracted ${extractedText.length} characters from PPTX (basic extraction)`);
      
      return extractedText || 'PPTX content extraction is limited. Please use PDF format for better results.';
    } catch (error) {
      console.error('[FileProcessingService] PPTX processing error:', error);
      // Fallback message for PPTX files
      return 'PPTX file detected. For best results, please export to PDF format.';
    }
  }

  async processText(file) {
    try {
      let content;
      
      if (file.buffer) {
        content = file.buffer.toString('utf-8');
      } else if (file.path) {
        content = await fs.readFile(file.path, 'utf-8');
      } else if (file.content) {
        content = Buffer.from(file.content, 'base64').toString('utf-8');
      } else if (typeof file.content === 'string') {
        content = file.content;
      } else {
        throw new Error('No file content available');
      }

      const cleanedText = this.cleanText(content);
      
      console.log(`[FileProcessingService] Processed text file: ${cleanedText.length} characters`);
      
      return cleanedText;
    } catch (error) {
      console.error('[FileProcessingService] Text processing error:', error);
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  async processImage(file) {
    try {
      console.log('[FileProcessingService] Starting OCR processing for image');
      
      let imageData;
      
      if (file.buffer) {
        imageData = file.buffer;
      } else if (file.path) {
        imageData = await fs.readFile(file.path);
      } else if (file.content) {
        imageData = Buffer.from(file.content, 'base64');
      } else {
        throw new Error('No image data available');
      }

      // Perform OCR using Tesseract.js
      const worker = await Tesseract.createWorker('eng');
      
      try {
        const { data: { text } } = await worker.recognize(imageData);
        await worker.terminate();
        
        const cleanedText = this.cleanText(text);
        
        console.log(`[FileProcessingService] OCR extracted ${cleanedText.length} characters from image`);
        
        return cleanedText || 'No text detected in image.';
      } catch (ocrError) {
        await worker.terminate();
        throw ocrError;
      }
    } catch (error) {
      console.error('[FileProcessingService] Image OCR error:', error);
      return 'Failed to extract text from image. Please ensure the image contains readable text.';
    }
  }

  cleanText(text) {
    if (!text) return '';
    
    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ');
    
    // Remove control characters except newlines and tabs
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize line endings
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Remove multiple consecutive newlines (keep max 2)
    text = text.replace(/\n{3,}/g, '\n\n');
    
    // Trim
    text = text.trim();
    
    return text;
  }

  chunkText(text, maxChunkSize = this.CHUNK_SIZE) {
    if (!text || text.length <= maxChunkSize) {
      return [text];
    }

    const chunks = [];
    const sentences = this.splitIntoSentences(text);
    let currentChunk = '';
    let currentSize = 0;

    for (const sentence of sentences) {
      const sentenceSize = this.estimateTokens(sentence);
      
      if (currentSize + sentenceSize > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.CHUNK_OVERLAP);
        currentChunk = overlapText + ' ' + sentence;
        currentSize = this.estimateTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentSize += sentenceSize;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    console.log(`[FileProcessingService] Split text into ${chunks.length} chunks`);
    
    return chunks;
  }

  splitIntoSentences(text) {
    // Simple sentence splitting - can be improved with NLP libraries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    return sentences.map(s => s.trim());
  }

  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  getOverlapText(text, overlapSize) {
    const words = text.split(/\s+/);
    const overlapWords = Math.ceil(overlapSize / 4); // Rough word count for overlap
    return words.slice(-overlapWords).join(' ');
  }

  validateFileSizes(files) {
    let totalSize = 0;
    
    for (const file of files) {
      const fileSize = file.size || (file.buffer ? file.buffer.length : 0);
      
      if (fileSize > this.MAX_FILE_SIZE) {
        throw new Error(`File ${file.fileName} exceeds maximum size of 50MB`);
      }
      
      totalSize += fileSize;
    }
    
    if (totalSize > this.MAX_TOTAL_SIZE) {
      throw new Error(`Total file size exceeds maximum of 200MB`);
    }
  }

  extractMetadata(processedFile) {
    const metadata = {
      fileName: processedFile.fileName,
      mimeType: processedFile.mimeType,
      processedAt: processedFile.processedAt,
      contentLength: processedFile.contentLength,
      wordCount: processedFile.wordCount,
      lineCount: processedFile.lineCount,
      language: this.detectLanguage(processedFile.content),
      readingTime: this.estimateReadingTime(processedFile.wordCount),
      complexity: this.assessComplexity(processedFile.content)
    };

    if (processedFile.chunks) {
      metadata.chunkCount = processedFile.chunks.length;
      metadata.avgChunkSize = Math.round(processedFile.contentLength / processedFile.chunks.length);
    }

    return metadata;
  }

  generateContentHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  countLines(text) {
    if (!text) return 0;
    return text.split('\n').length;
  }

  detectLanguage(text) {
    // Simple language detection - in production use a proper library
    const sample = text.substring(0, 1000).toLowerCase();
    
    // Check for common English words
    const englishWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    const englishCount = englishWords.filter(word => sample.includes(` ${word} `)).length;
    
    if (englishCount >= 5) return 'en';
    
    // Default to English for now
    return 'en';
  }

  estimateReadingTime(wordCount) {
    // Average reading speed: 200-250 words per minute
    const wordsPerMinute = 225;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min`;
  }

  assessComplexity(text) {
    if (!text) return 'low';
    
    const avgWordLength = text.length / this.countWords(text);
    const sentenceCount = (text.match(/[.!?]+/g) || []).length;
    const avgSentenceLength = this.countWords(text) / (sentenceCount || 1);
    
    // Simple complexity scoring
    if (avgWordLength > 6 || avgSentenceLength > 25) return 'high';
    if (avgWordLength > 5 || avgSentenceLength > 20) return 'medium';
    return 'low';
  }

  async downloadAndProcessFile(fileUrl, fileName, mimeType) {
    try {
      console.log(`[FileProcessingService] Downloading file: ${fileName} from ${fileUrl}`);
      
      // This would typically download from Google Drive or other storage
      // For now, we'll throw an error indicating this needs to be implemented
      throw new Error('File download not implemented. Use file buffer or path instead.');
    } catch (error) {
      console.error('[FileProcessingService] Download error:', error);
      throw error;
    }
  }
}

module.exports = new FileProcessingService();