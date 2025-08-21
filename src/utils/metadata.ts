import { ScreenshotData } from '@/types';

export interface EmbeddedMetadata {
  url: string;
  timestamp: number;
  coordinates: { x: number; y: number };
  annotation?: string;
  voiceNote?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  devicePixelRatio: number;
  extensionVersion: string;
  captureMethod: 'alt-click' | 'shortcut' | 'popup';
}

export interface ExifData {
  [key: string]: string | number;
}

/**
 * Metadata embedding utility for screenshots
 */
export class MetadataEmbedder {
  private readonly extensionVersion = '1.0.0';

  /**
   * Embed metadata into PNG image data URL
   */
  async embedMetadataInPNG(
    dataUrl: string,
    screenshotData: ScreenshotData,
    captureMethod: 'alt-click' | 'shortcut' | 'popup' = 'alt-click'
  ): Promise<string> {
    try {
      // Convert data URL to array buffer
      const arrayBuffer = this.dataUrlToArrayBuffer(dataUrl);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Create metadata object
      const metadata = this.createMetadata(screenshotData, captureMethod);

      // Embed metadata as PNG text chunks
      const modifiedPNG = this.addPNGTextChunks(uint8Array, metadata);

      // Convert back to data URL
      return this.arrayBufferToDataUrl(modifiedPNG.buffer, 'image/png');
    } catch (error) {
      console.error('Failed to embed metadata in PNG:', error);
      // Return original data URL if embedding fails
      return dataUrl;
    }
  }

  /**
   * Embed metadata into JPEG image data URL
   */
  async embedMetadataInJPEG(
    dataUrl: string,
    screenshotData: ScreenshotData,
    captureMethod: 'alt-click' | 'shortcut' | 'popup' = 'alt-click'
  ): Promise<string> {
    try {
      // Convert data URL to array buffer
      const arrayBuffer = this.dataUrlToArrayBuffer(dataUrl);
      const uint8Array = new Uint8Array(arrayBuffer);

      // Create metadata object
      const metadata = this.createMetadata(screenshotData, captureMethod);

      // Embed metadata as JPEG comment
      const modifiedJPEG = this.addJPEGComment(uint8Array, metadata);

      // Convert back to data URL
      return this.arrayBufferToDataUrl(modifiedJPEG.buffer, 'image/jpeg');
    } catch (error) {
      console.error('Failed to embed metadata in JPEG:', error);
      // Return original data URL if embedding fails
      return dataUrl;
    }
  }

  /**
   * Extract metadata from PNG image
   */
  extractMetadataFromPNG(dataUrl: string): EmbeddedMetadata | null {
    try {
      const arrayBuffer = this.dataUrlToArrayBuffer(dataUrl);
      const uint8Array = new Uint8Array(arrayBuffer);

      return this.readPNGTextChunks(uint8Array);
    } catch (error) {
      console.error('Failed to extract metadata from PNG:', error);
      return null;
    }
  }

  /**
   * Extract metadata from JPEG image
   */
  extractMetadataFromJPEG(dataUrl: string): EmbeddedMetadata | null {
    try {
      const arrayBuffer = this.dataUrlToArrayBuffer(dataUrl);
      const uint8Array = new Uint8Array(arrayBuffer);

      return this.readJPEGComment(uint8Array);
    } catch (error) {
      console.error('Failed to extract metadata from JPEG:', error);
      return null;
    }
  }

  /**
   * Create metadata object
   */
  private createMetadata(
    screenshotData: ScreenshotData,
    captureMethod: 'alt-click' | 'shortcut' | 'popup'
  ): EmbeddedMetadata {
    return {
      url: screenshotData.url,
      timestamp: screenshotData.timestamp,
      coordinates: screenshotData.coordinates,
      annotation: screenshotData.annotation,
      voiceNote: screenshotData.voiceNote,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      extensionVersion: this.extensionVersion,
      captureMethod,
    };
  }

  /**
   * Add text chunks to PNG image
   */
  private addPNGTextChunks(
    pngData: Uint8Array,
    metadata: EmbeddedMetadata
  ): Uint8Array {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);

    // Find IHDR chunk (should be first chunk after signature)
    let offset = 8; // Skip PNG signature

    // Read IHDR chunk
    const ihdrLength = this.readUint32BE(pngData, offset);
    const ihdrEnd = offset + 4 + 4 + ihdrLength + 4; // length + type + data + crc

    // Create text chunks for metadata
    const textChunks = this.createPNGTextChunks(metadata);

    // Calculate new file size
    const textChunksSize = textChunks.reduce(
      (size, chunk) => size + chunk.length,
      0
    );
    const newSize = pngData.length + textChunksSize;

    // Create new PNG data
    const newPngData = new Uint8Array(newSize);

    // Copy PNG signature and IHDR
    newPngData.set(pngData.subarray(0, ihdrEnd), 0);

    // Insert text chunks after IHDR
    let insertOffset = ihdrEnd;
    for (const chunk of textChunks) {
      newPngData.set(chunk, insertOffset);
      insertOffset += chunk.length;
    }

    // Copy remaining chunks
    newPngData.set(pngData.subarray(ihdrEnd), insertOffset);

    return newPngData;
  }

  /**
   * Create PNG text chunks from metadata
   */
  private createPNGTextChunks(metadata: EmbeddedMetadata): Uint8Array[] {
    const chunks: Uint8Array[] = [];

    // Create tEXt chunk for JSON metadata
    const jsonData = JSON.stringify(metadata);
    const keyword = 'InsightClip';
    const textData = new TextEncoder().encode(keyword + '\0' + jsonData);

    chunks.push(this.createPNGChunk('tEXt', textData));

    // Create individual tEXt chunks for key metadata
    const keyValuePairs = [
      ['URL', metadata.url],
      ['Timestamp', metadata.timestamp.toString()],
      ['Coordinates', `${metadata.coordinates.x},${metadata.coordinates.y}`],
      ['Extension', `InsightClip v${metadata.extensionVersion}`],
    ];

    if (metadata.annotation) {
      keyValuePairs.push(['Annotation', metadata.annotation]);
    }

    for (const [key, value] of keyValuePairs) {
      const data = new TextEncoder().encode(key + '\0' + value);
      chunks.push(this.createPNGChunk('tEXt', data));
    }

    return chunks;
  }

  /**
   * Create a PNG chunk
   */
  private createPNGChunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const length = data.length;
    const chunk = new Uint8Array(4 + 4 + length + 4); // length + type + data + crc

    // Write length (big-endian)
    this.writeUint32BE(chunk, 0, length);

    // Write type
    chunk.set(typeBytes, 4);

    // Write data
    chunk.set(data, 8);

    // Calculate and write CRC
    const crcData = new Uint8Array(4 + length);
    crcData.set(typeBytes, 0);
    crcData.set(data, 4);
    const crc = this.calculateCRC32(crcData);
    this.writeUint32BE(chunk, 8 + length, crc);

    return chunk;
  }

  /**
   * Read PNG text chunks
   */
  private readPNGTextChunks(pngData: Uint8Array): EmbeddedMetadata | null {
    let offset = 8; // Skip PNG signature

    while (offset < pngData.length - 8) {
      const length = this.readUint32BE(pngData, offset);
      const type = new TextDecoder().decode(
        pngData.subarray(offset + 4, offset + 8)
      );

      if (type === 'tEXt') {
        const data = pngData.subarray(offset + 8, offset + 8 + length);
        const text = new TextDecoder().decode(data);
        const nullIndex = text.indexOf('\0');

        if (nullIndex > 0) {
          const keyword = text.substring(0, nullIndex);
          const value = text.substring(nullIndex + 1);

          if (keyword === 'InsightClip') {
            try {
              return JSON.parse(value) as EmbeddedMetadata;
            } catch (error) {
              console.warn('Failed to parse embedded metadata:', error);
            }
          }
        }
      }

      // Move to next chunk
      offset += 4 + 4 + length + 4; // length + type + data + crc

      // Stop at IEND chunk
      if (type === 'IEND') break;
    }

    return null;
  }

  /**
   * Add comment to JPEG image
   */
  private addJPEGComment(
    jpegData: Uint8Array,
    metadata: EmbeddedMetadata
  ): Uint8Array {
    // JPEG starts with SOI marker (0xFFD8)
    if (jpegData[0] !== 0xff || jpegData[1] !== 0xd8) {
      throw new Error('Invalid JPEG format');
    }

    // Create comment segment
    const jsonData = JSON.stringify(metadata);
    const commentData = new TextEncoder().encode(jsonData);
    const commentSegment = new Uint8Array(4 + commentData.length);

    // COM marker (0xFFFE)
    commentSegment[0] = 0xff;
    commentSegment[1] = 0xfe;

    // Length (big-endian, includes length bytes)
    const length = commentData.length + 2;
    commentSegment[2] = (length >> 8) & 0xff;
    commentSegment[3] = length & 0xff;

    // Comment data
    commentSegment.set(commentData, 4);

    // Find position to insert comment (after SOI, before other segments)
    let insertPos = 2; // After SOI marker

    // Create new JPEG with comment
    const newJpegData = new Uint8Array(jpegData.length + commentSegment.length);
    newJpegData.set(jpegData.subarray(0, insertPos), 0);
    newJpegData.set(commentSegment, insertPos);
    newJpegData.set(
      jpegData.subarray(insertPos),
      insertPos + commentSegment.length
    );

    return newJpegData;
  }

  /**
   * Read JPEG comment
   */
  private readJPEGComment(jpegData: Uint8Array): EmbeddedMetadata | null {
    let offset = 2; // Skip SOI marker

    while (offset < jpegData.length - 1) {
      if (jpegData[offset] !== 0xff) break;

      const marker = jpegData[offset + 1];

      if (marker === 0xfe) {
        // COM marker
        const length = (jpegData[offset + 2] << 8) | jpegData[offset + 3];
        const commentData = jpegData.subarray(offset + 4, offset + 2 + length);
        const commentText = new TextDecoder().decode(commentData);

        try {
          return JSON.parse(commentText) as EmbeddedMetadata;
        } catch (error) {
          // Not our metadata, continue searching
        }
      }

      // Skip this segment
      if (marker >= 0xd0 && marker <= 0xd7) {
        // RST markers have no length
        offset += 2;
      } else if (marker === 0xd8 || marker === 0xd9) {
        // SOI/EOI markers have no length
        offset += 2;
      } else {
        // Other markers have length
        const segmentLength =
          (jpegData[offset + 2] << 8) | jpegData[offset + 3];
        offset += 2 + segmentLength;
      }
    }

    return null;
  }

  /**
   * Utility functions
   */
  private dataUrlToArrayBuffer(
    dataUrl: string
  ): ArrayBuffer | SharedArrayBuffer {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer as ArrayBuffer;
  }

  private arrayBufferToDataUrl(
    buffer: ArrayBuffer | SharedArrayBuffer,
    mimeType: string
  ): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';

    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    const base64 = btoa(binaryString);
    return `data:${mimeType};base64,${base64}`;
  }

  private readUint32BE(data: Uint8Array, offset: number): number {
    return (
      (data[offset] << 24) |
      (data[offset + 1] << 16) |
      (data[offset + 2] << 8) |
      data[offset + 3]
    );
  }

  private writeUint32BE(data: Uint8Array, offset: number, value: number): void {
    data[offset] = (value >> 24) & 0xff;
    data[offset + 1] = (value >> 16) & 0xff;
    data[offset + 2] = (value >> 8) & 0xff;
    data[offset + 3] = value & 0xff;
  }

  private calculateCRC32(data: Uint8Array): number {
    // Simplified CRC32 calculation
    // In a production environment, you'd use a proper CRC32 implementation
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
  }
}

/**
 * Metadata utility functions
 */
export const MetadataUtils = {
  /**
   * Format metadata for display
   */
  formatMetadata(metadata: EmbeddedMetadata): Record<string, string> {
    return {
      URL: metadata.url,
      Captured: new Date(metadata.timestamp).toLocaleString(),
      Coordinates: `(${metadata.coordinates.x}, ${metadata.coordinates.y})`,
      Method: metadata.captureMethod,
      Viewport: `${metadata.viewport.width}×${metadata.viewport.height}`,
      'Device Pixel Ratio': metadata.devicePixelRatio.toString(),
      'Extension Version': metadata.extensionVersion,
      'User Agent': metadata.userAgent,
      ...(metadata.annotation && { Annotation: metadata.annotation }),
      ...(metadata.voiceNote && { 'Voice Note': 'Present' }),
    };
  },

  /**
   * Validate metadata structure
   */
  isValidMetadata(obj: any): obj is EmbeddedMetadata {
    return (
      obj &&
      typeof obj.url === 'string' &&
      typeof obj.timestamp === 'number' &&
      obj.coordinates &&
      typeof obj.coordinates.x === 'number' &&
      typeof obj.coordinates.y === 'number' &&
      typeof obj.userAgent === 'string' &&
      obj.viewport &&
      typeof obj.viewport.width === 'number' &&
      typeof obj.viewport.height === 'number' &&
      typeof obj.devicePixelRatio === 'number' &&
      typeof obj.extensionVersion === 'string' &&
      typeof obj.captureMethod === 'string'
    );
  },

  /**
   * Extract domain from metadata URL
   */
  extractDomain(metadata: EmbeddedMetadata): string {
    try {
      return new URL(metadata.url).hostname;
    } catch {
      return 'unknown';
    }
  },

  /**
   * Check if metadata is recent
   */
  isRecent(
    metadata: EmbeddedMetadata,
    maxAgeMs = 24 * 60 * 60 * 1000
  ): boolean {
    return Date.now() - metadata.timestamp < maxAgeMs;
  },

  /**
   * Generate metadata summary
   */
  generateSummary(metadata: EmbeddedMetadata): string {
    const domain = this.extractDomain(metadata);
    const date = new Date(metadata.timestamp).toLocaleDateString();
    const coords = `(${metadata.coordinates.x}, ${metadata.coordinates.y})`;

    return `Screenshot from ${domain} on ${date} at ${coords}`;
  },
};

// Export singleton instance
export const metadataEmbedder = new MetadataEmbedder();
