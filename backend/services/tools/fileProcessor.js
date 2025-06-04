const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
// const fileType = require('file-type'); // Removed - using file extension detection instead
const marked = require('marked');
const cheerio = require('cheerio');

/**
 * FileProcessor - Extracts and optimizes content from various file types for LLM processing
 */
class FileProcessor {
  constructor(options = {}) {
    this.options = {
      maxTokens: options.maxTokens || 100000,
      chunkSize: options.chunkSize || 4000,
      chunkOverlap: options.chunkOverlap || 200,
      includeMetadata: options.includeMetadata !== false,
      preserveStructure: options.preserveStructure !== false,
      cleanWhitespace: options.cleanWhitespace !== false,
      ...options
    };
  }

  /**
   * Process a file and extract content optimized for LLM consumption
   * @param {string|Buffer} input - File path or buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processed content with metadata
   */
  async processFile(input, options = {}) {
    const opts = { ...this.options, ...options };
    
    try {
      // Get file buffer and detect type
      const { buffer, filePath, fileName } = await this._prepareInput(input);
      // Use provided fileName from options if available
      const actualFileName = opts.fileName || fileName;
      // Detect file type from extension or content
      const ext = await this._detectFileType(buffer, actualFileName);
      
      // Process based on file type
      let result;
      switch (ext) {
        case 'pdf':
          result = await this._processPDF(buffer, opts);
          break;
        case 'docx':
          result = await this._processDOCX(buffer, opts);
          break;
        case 'pptx':
          result = await this._processPPTX(buffer, opts);
          break;
        case 'xlsx':
        case 'xls':
          result = await this._processExcel(buffer, opts);
          break;
        case 'txt':
        case 'text':
          result = await this._processText(buffer, opts);
          break;
        case 'md':
        case 'markdown':
          result = await this._processMarkdown(buffer, opts);
          break;
        case 'html':
        case 'htm':
          result = await this._processHTML(buffer, opts);
          break;
        case 'csv':
          result = await this._processCSV(buffer, opts);
          break;
        case 'json':
          result = await this._processJSON(buffer, opts);
          break;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'bmp':
          result = await this._processImage(buffer, opts);
          break;
        default:
          // Try to process as text
          result = await this._processText(buffer, opts);
      }

      // Add common metadata
      result.metadata = {
        ...result.metadata,
        fileName: actualFileName,
        fileType: ext,
        processedAt: new Date().toISOString(),
        fileSize: buffer.length,
        processingOptions: opts
      };

      // Apply LLM optimizations
      if (opts.cleanWhitespace) {
        result.content = this._cleanWhitespace(result.content);
      }

      if (opts.chunkSize && result.content.length > opts.chunkSize) {
        result.chunks = this._chunkContent(result.content, opts.chunkSize, opts.chunkOverlap);
      }

      return result;
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  /**
   * Process PDF files
   */
  async _processPDF(buffer, options) {
    try {
      const data = await pdfParse(buffer);
      
      const result = {
        content: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info,
          version: data.version
        }
      };

      // Extract structure if available
      if (options.preserveStructure && data.text) {
        result.structure = this._extractStructureFromText(data.text);
      }

      return result;
    } catch (error) {
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Process DOCX files
   */
  async _processDOCX(buffer, options) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const htmlResult = await mammoth.convertToHtml({ buffer });
      
      const output = {
        content: result.value,
        metadata: {
          messages: result.messages
        }
      };

      // Extract structure from HTML if requested
      if (options.preserveStructure && htmlResult.value) {
        const $ = cheerio.load(htmlResult.value);
        output.structure = {
          headings: $('h1, h2, h3, h4, h5, h6').map((i, el) => ({
            level: parseInt(el.name.charAt(1)),
            text: $(el).text()
          })).get(),
          lists: $('ul, ol').map((i, el) => ({
            type: el.name,
            items: $(el).find('li').map((j, li) => $(li).text()).get()
          })).get(),
          tables: this._extractTablesFromHTML($)
        };
      }

      return output;
    } catch (error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
  }

  /**
   * Process PowerPoint files (simplified - full implementation would use node-pptx)
   */
  async _processPPTX(buffer, options) {
    // For now, we'll treat PPTX similar to DOCX since node-pptx requires more complex setup
    // In production, you'd want to use a proper PPTX parser
    try {
      // This is a placeholder - real implementation would extract slides
      return {
        content: 'PowerPoint file detected. Full PPTX parsing not yet implemented.',
        metadata: {
          fileType: 'pptx',
          note: 'Implement proper PPTX parsing with node-pptx or similar'
        }
      };
    } catch (error) {
      throw new Error(`PPTX processing failed: ${error.message}`);
    }
  }

  /**
   * Process Excel files
   */
  async _processExcel(buffer, options) {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = {};
      let allContent = '';

      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        sheets[sheetName] = {
          csv,
          json,
          rowCount: json.length
        };
        
        // Create readable content
        allContent += `\n## Sheet: ${sheetName}\n${csv}\n`;
      });

      return {
        content: allContent.trim(),
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames
        },
        structure: {
          sheets
        }
      };
    } catch (error) {
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  /**
   * Process plain text files
   */
  async _processText(buffer, options) {
    const content = buffer.toString('utf-8');
    
    return {
      content,
      metadata: {
        lineCount: content.split('\n').length,
        wordCount: content.split(/\s+/).filter(word => word.length > 0).length
      }
    };
  }

  /**
   * Process Markdown files
   */
  async _processMarkdown(buffer, options) {
    const content = buffer.toString('utf-8');
    const html = marked.parse(content);
    
    const result = {
      content,
      metadata: {
        format: 'markdown'
      },
      structure: {} // Initialize structure
    };

    if (options.preserveStructure) {
      const $ = cheerio.load(html);
      result.structure = {
        headings: $('h1, h2, h3, h4, h5, h6').map((i, el) => ({
          level: parseInt(el.name.charAt(1)),
          text: $(el).text()
        })).get(),
        codeBlocks: $('pre code').map((i, el) => $(el).text()).get()
      };
    }

    return result;
  }

  /**
   * Process HTML files
   */
  async _processHTML(buffer, options) {
    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);
    
    // Remove script and style tags
    $('script, style').remove();
    
    // Extract text content
    const content = $('body').text() || $.root().text();
    
    const result = {
      content: content.trim(),
      metadata: {
        title: $('title').text() || undefined,
        metaDescription: $('meta[name="description"]').attr('content') || undefined
      }
    };

    if (options.preserveStructure) {
      result.structure = {
        headings: $('h1, h2, h3, h4, h5, h6').map((i, el) => ({
          level: parseInt(el.name.charAt(1)),
          text: $(el).text()
        })).get(),
        links: $('a[href]').map((i, el) => ({
          text: $(el).text(),
          href: $(el).attr('href')
        })).get()
      };
    }

    return result;
  }

  /**
   * Process CSV files
   */
  async _processCSV(buffer, options) {
    const content = buffer.toString('utf-8');
    const rows = content.split('\n').filter(row => row.trim());
    
    return {
      content,
      metadata: {
        rowCount: rows.length,
        columnCount: rows[0] ? rows[0].split(',').length : 0
      }
    };
  }

  /**
   * Process JSON files
   */
  async _processJSON(buffer, options) {
    const content = buffer.toString('utf-8');
    let parsed;
    
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      // If invalid JSON, treat as text
      return this._processText(buffer, options);
    }
    
    return {
      content: JSON.stringify(parsed, null, 2),
      metadata: {
        format: 'json',
        keys: Array.isArray(parsed) ? [] : Object.keys(parsed)
      },
      structure: {
        parsed
      }
    };
  }

  /**
   * Process image files (placeholder for OCR)
   */
  async _processImage(buffer, options) {
    // In production, you would use tesseract.js or another OCR library here
    return {
      content: 'Image file detected. OCR processing not yet implemented.',
      metadata: {
        fileType: 'image',
        note: 'Implement OCR with tesseract.js or cloud service'
      }
    };
  }

  /**
   * Helper: Detect file type from buffer content or filename
   */
  async _detectFileType(buffer, fileName) {
    // First try to detect from file extension
    if (fileName) {
      const ext = path.extname(fileName).slice(1).toLowerCase();
      if (ext) return ext;
    }

    // Try to detect from content
    const firstBytes = buffer.slice(0, 100).toString('utf-8');
    
    // PDF detection
    if (buffer.slice(0, 4).toString() === '%PDF') {
      return 'pdf';
    }
    
    // DOCX detection (ZIP with specific content)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
      // Could be DOCX, PPTX, or XLSX - check filename
      if (fileName) {
        if (fileName.endsWith('.docx')) return 'docx';
        if (fileName.endsWith('.pptx')) return 'pptx';
        if (fileName.endsWith('.xlsx')) return 'xlsx';
      }
      return 'zip'; // Generic ZIP
    }
    
    // JSON detection
    try {
      JSON.parse(buffer.toString('utf-8'));
      return 'json';
    } catch (e) {
      // Not JSON
    }
    
    // HTML detection
    if (firstBytes.includes('<html') || firstBytes.includes('<!DOCTYPE')) {
      return 'html';
    }
    
    // Markdown detection
    if (fileName && (fileName.endsWith('.md') || fileName.endsWith('.markdown'))) {
      return 'md';
    }
    
    // CSV detection
    if (fileName && fileName.endsWith('.csv')) {
      return 'csv';
    }
    
    // Default to text
    return 'txt';
  }

  /**
   * Helper: Prepare input (convert file path to buffer if needed)
   */
  async _prepareInput(input) {
    if (Buffer.isBuffer(input)) {
      return {
        buffer: input,
        filePath: null,
        fileName: 'buffer'
      };
    } else if (typeof input === 'string') {
      const buffer = await fs.readFile(input);
      return {
        buffer,
        filePath: input,
        fileName: path.basename(input)
      };
    } else {
      throw new Error('Input must be a file path or buffer');
    }
  }

  /**
   * Helper: Extract structure from plain text
   */
  _extractStructureFromText(text) {
    const lines = text.split('\n');
    const structure = {
      headings: [],
      paragraphs: [],
      lists: []
    };

    let currentParagraph = '';
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Detect headings (lines in all caps or followed by underlines)
      if (trimmed && trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
        structure.headings.push({ text: trimmed, level: 1 });
      } else if (trimmed.startsWith('"') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
        // Detect list items
        structure.lists.push(trimmed.substring(1).trim());
      } else if (trimmed) {
        currentParagraph += trimmed + ' ';
      } else if (currentParagraph) {
        structure.paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
    });

    if (currentParagraph) {
      structure.paragraphs.push(currentParagraph.trim());
    }

    return structure;
  }

  /**
   * Helper: Extract tables from HTML
   */
  _extractTablesFromHTML($) {
    return $('table').map((i, table) => {
      const headers = $(table).find('th').map((j, th) => $(th).text()).get();
      const rows = $(table).find('tr').map((j, tr) => {
        return [$(tr).find('td').map((k, td) => $(td).text()).get()];
      }).get().filter(row => row.length > 0);
      
      return { headers, rows };
    }).get();
  }

  /**
   * Helper: Clean excessive whitespace
   */
  _cleanWhitespace(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/^\s+|\s+$/gm, '')
      .trim();
  }

  /**
   * Helper: Chunk content for LLM processing
   */
  _chunkContent(text, chunkSize, overlap) {
    const chunks = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let currentChunk = '';
    let currentSize = 0;
    
    sentences.forEach(sentence => {
      if (currentSize + sentence.length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        // Keep overlap
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlap / 5));
        currentChunk = overlapWords.join(' ') + ' ' + sentence;
        currentSize = currentChunk.length;
      } else {
        currentChunk += sentence + ' ';
        currentSize += sentence.length;
      }
    });
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Batch process multiple files
   */
  async processFiles(inputs, options = {}) {
    const results = await Promise.all(
      inputs.map(input => this.processFile(input, options))
    );
    
    return results;
  }
}

// Export a singleton instance and the class
const defaultProcessor = new FileProcessor();

module.exports = {
  FileProcessor,
  processFile: defaultProcessor.processFile.bind(defaultProcessor),
  processFiles: defaultProcessor.processFiles.bind(defaultProcessor)
};