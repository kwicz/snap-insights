import { ScreenshotData, ExtensionSettings } from '@/types';
import { ScreenshotUtils } from './screenshot';

// Constants for optimization
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_PARALLEL_WRITES = 3;
const CACHE_SIZE = 50;

export interface SaveOptions {
  createSubfolders?: boolean;
  organizeByMonth?: boolean;
  customPath?: string;
  saveMetadata?: boolean;
  onProgress?: (progress: number) => void;
}

export interface SaveResult {
  downloadId: number;
  filename: string;
  fullPath: string;
  size: number;
  success: boolean;
  error?: string;
  processingTime?: number;
}

export interface StorageStats {
  totalScreenshots: number;
  totalSize: number;
  lastSaved: number;
  monthlyCount: number;
  averageSize: number;
  processingTimes: number[];
}

/**
 * File storage and organization utility for screenshots
 */
export class FileStorageManager {
  private readonly basePath = 'UX-Research-Screenshots';
  private settings: ExtensionSettings | null = null;
  private pathCache: Map<string, string> = new Map();
  private writeQueue: Array<{ id: number; task: Promise<void> }> = [];
  private processingTimes: number[] = [];
  private storageStats: StorageStats | null = null;

  constructor() {
    this.loadSettings();
    this.initializeStorageStats();
  }

  /**
   * Save screenshot with automatic organization and progress tracking
   */
  async saveScreenshot(
    screenshotData: ScreenshotData,
    options: SaveOptions = {}
  ): Promise<SaveResult> {
    const startTime = performance.now();
    const {
      createSubfolders = true,
      organizeByMonth = true,
      saveMetadata = true,
      customPath,
      onProgress,
    } = options;

    try {
      // Generate path and filename in parallel
      const [organizationPath, generatedFilename] = await Promise.all([
        this.getOrganizationPath(screenshotData.url, screenshotData.timestamp, {
          createSubfolders,
          organizeByMonth,
          customPath,
        }),
        this.generateOptimizedFilename(screenshotData),
      ]);

      const fullPath = `${organizationPath}/${generatedFilename}`;
      const fileSize = ScreenshotUtils.getDataUrlSize(screenshotData.dataUrl);

      // Process data in chunks
      const chunks = this.splitIntoChunks(screenshotData.dataUrl);
      let processedSize = 0;

      // Create blob parts array
      const blobParts: Array<string | ArrayBuffer | Uint8Array<ArrayBuffer>> =
        [];

      // Process chunks with progress tracking
      for (const chunk of chunks) {
        const processedChunk = await this.processChunk(chunk);
        // Convert ArrayBufferLike to ArrayBuffer
        const arrayBuffer =
          processedChunk.buffer instanceof ArrayBuffer
            ? processedChunk.buffer
            : new ArrayBuffer(processedChunk.byteLength);
        blobParts.push(new Uint8Array(arrayBuffer));

        processedSize += chunk.length;
        onProgress?.(processedSize / fileSize);
      }

      // Create blob and object URL
      const blob = new Blob(blobParts, { type: 'image/png' });
      const objectUrl = URL.createObjectURL(blob);

      // Manage write queue
      await this.manageWriteQueue();

      // Initiate download with retry mechanism
      const downloadId = await this.initiateDownload(objectUrl, fullPath);

      // Process metadata in parallel with download
      if (saveMetadata) {
        await this.saveOptimizedMetadata(downloadId, screenshotData, fullPath);
      }

      // Update storage stats
      await this.updateStorageStats(fileSize, performance.now() - startTime);

      // Cleanup
      URL.revokeObjectURL(objectUrl);
      this.cleanupCache();

      return {
        downloadId,
        filename: generatedFilename,
        fullPath,
        size: fileSize,
        success: true,
        processingTime: performance.now() - startTime,
      };
    } catch (error) {
      console.error('Failed to save screenshot:', error);
      return {
        downloadId: -1,
        filename: '',
        fullPath: '',
        size: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Generate organized directory path
   */
  private generateOrganizationPath(
    url: string,
    timestamp: number,
    options: {
      createSubfolders: boolean;
      organizeByMonth: boolean;
      customPath?: string;
    }
  ): string {
    const { createSubfolders, organizeByMonth, customPath } = options;

    // Start with base path
    let path = customPath || this.basePath;

    if (createSubfolders) {
      // Add date-based organization
      if (organizeByMonth) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });

        path += `/${year}/${month}-${monthName}`;
      }

      // Add domain-based organization
      try {
        const domain = new URL(url).hostname;
        const cleanDomain = domain
          .replace(/^www\./, '')
          .replace(/[^a-zA-Z0-9.-]/g, '-');
        path += `/by-domain/${cleanDomain}`;
      } catch (error) {
        console.warn('Failed to parse URL for domain organization:', error);
      }
    }

    return path;
  }

  /**
   * Generate filename with timestamp and domain
   */
  private generateFilename(url: string, timestamp: number): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-mm-ss

    let domain = 'unknown';
    try {
      domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');
    } catch (error) {
      console.warn('Failed to parse URL for filename:', error);
    }

    return `ux-screenshot_${dateStr}_${timeStr}_${domain}.png`;
  }

  /**
   * Get organization path with caching
   */
  private async getOrganizationPath(
    url: string,
    timestamp: number,
    options: {
      createSubfolders: boolean;
      organizeByMonth: boolean;
      customPath?: string;
    }
  ): Promise<string> {
    const cacheKey = `${url}-${timestamp}-${JSON.stringify(options)}`;
    const cached = this.pathCache.get(cacheKey);
    if (cached) return cached;

    const path = await this.generateOrganizationPath(url, timestamp, options);

    if (this.pathCache.size >= CACHE_SIZE) {
      const firstKey = this.pathCache.keys().next().value;
      if (firstKey) {
        this.pathCache.delete(firstKey);
      }
    }
    this.pathCache.set(cacheKey, path);

    return path;
  }

  /**
   * Split data into processable chunks
   */
  private splitIntoChunks(dataUrl: string): Uint8Array[] {
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const length = binary.length;
    const chunks: Uint8Array[] = [];

    for (let i = 0; i < length; i += CHUNK_SIZE) {
      const chunk = new Uint8Array(Math.min(CHUNK_SIZE, length - i));
      for (let j = 0; j < chunk.length; j++) {
        chunk[j] = binary.charCodeAt(i + j);
      }
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Process individual chunk with optimization
   */
  private async processChunk(chunk: Uint8Array): Promise<Uint8Array> {
    // Process in web worker if available
    if (typeof Worker !== 'undefined') {
      return new Promise((resolve) => {
        const worker = new Worker(
          URL.createObjectURL(
            new Blob([
              `self.onmessage = function(e) {
                const chunk = e.data;
                // Add any chunk-specific processing here
                self.postMessage(chunk);
              }`,
            ])
          )
        );

        worker.onmessage = (e) => {
          resolve(e.data);
          worker.terminate();
        };

        worker.postMessage(chunk);
      });
    }

    // Fallback to main thread processing
    return chunk;
  }

  /**
   * Manage parallel write operations
   */
  private async manageWriteQueue(): Promise<void> {
    while (this.writeQueue.length >= MAX_PARALLEL_WRITES) {
      await Promise.race(this.writeQueue.map(({ task }) => task));
      this.writeQueue = this.writeQueue.filter(({ task }) =>
        task.then(
          () => false,
          () => false
        )
      );
    }
  }

  /**
   * Initiate download with retry mechanism
   */
  private async initiateDownload(
    objectUrl: string,
    fullPath: string,
    retries = 3
  ): Promise<number> {
    for (let i = 0; i < retries; i++) {
      try {
        return await chrome.downloads.download({
          url: objectUrl,
          filename: fullPath,
          saveAs: false,
          conflictAction: 'uniquify',
        });
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    throw new Error('Failed to initiate download after retries');
  }

  /**
   * Save metadata with optimization
   */
  private async saveOptimizedMetadata(
    downloadId: number,
    screenshotData: ScreenshotData,
    fullPath: string
  ): Promise<void> {
    const metadataTask = new Promise<void>(async (resolve, reject) => {
      try {
        const metadata = {
          ...screenshotData,
          downloadId,
          savedPath: fullPath,
          savedAt: Date.now(),
        };

        // Store metadata in chunks if large
        const metadataStr = JSON.stringify(metadata);
        if (metadataStr.length > CHUNK_SIZE) {
          const chunks = this.splitIntoChunks(metadataStr);
          for (const chunk of chunks) {
            await chrome.storage.local.set({
              [`metadata_${downloadId}_${chunk}`]: chunk,
            });
          }
        } else {
          await chrome.storage.local.set({
            [`metadata_${downloadId}`]: metadata,
          });
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });

    this.writeQueue.push({ id: downloadId, task: metadataTask });
  }

  /**
   * Generate optimized filename
   */
  private async generateOptimizedFilename(
    screenshotData: ScreenshotData
  ): Promise<string> {
    const { url, timestamp } = screenshotData;
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');

    // Hash the URL for shorter filenames
    const urlHash = await crypto.subtle
      .digest('SHA-1', new TextEncoder().encode(url))
      .then((hash) =>
        Array.from(new Uint8Array(hash))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .slice(0, 8)
      );

    return `ux-${dateStr}_${timeStr}_${urlHash}.png`;
  }

  /**
   * Initialize storage statistics
   */
  private async initializeStorageStats(): Promise<void> {
    try {
      const stats = await chrome.storage.local.get('storageStats');
      this.storageStats = stats.storageStats || {
        totalScreenshots: 0,
        totalSize: 0,
        lastSaved: 0,
        monthlyCount: 0,
        averageSize: 0,
        processingTimes: [],
      };
    } catch (error) {
      console.error('Failed to initialize storage stats:', error);
    }
  }

  /**
   * Update storage statistics with optimization metrics
   */
  private async updateStorageStats(
    fileSize: number,
    processingTime: number
  ): Promise<void> {
    if (!this.storageStats) return;

    this.storageStats.totalScreenshots++;
    this.storageStats.totalSize += fileSize;
    this.storageStats.lastSaved = Date.now();
    this.storageStats.monthlyCount++;
    this.storageStats.averageSize =
      this.storageStats.totalSize / this.storageStats.totalScreenshots;

    // Keep last 100 processing times
    this.storageStats.processingTimes.push(processingTime);
    if (this.storageStats.processingTimes.length > 100) {
      this.storageStats.processingTimes.shift();
    }

    await chrome.storage.local.set({ storageStats: this.storageStats });
  }

  /**
   * Clean up cache periodically
   */
  private cleanupCache(): void {
    if (this.pathCache.size > CACHE_SIZE * 0.8) {
      const entriesToRemove = this.pathCache.size - CACHE_SIZE;
      let count = 0;
      for (const key of this.pathCache.keys()) {
        if (count >= entriesToRemove) break;
        this.pathCache.delete(key);
        count++;
      }
    }
  }

  /**
   * Show save notification
   */
  private async showSaveNotification(
    filename: string,
    fileSize: number
  ): Promise<void> {
    const formattedSize = ScreenshotUtils.formatFileSize(fileSize);
    const message = `Screenshot saved: ${filename} (${formattedSize})`;

    // Send message to content script for in-page notification
    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (activeTab.id) {
        await chrome.tabs.sendMessage(activeTab.id, {
          type: 'SHOW_NOTIFICATION',
          data: { message, type: 'success' },
        });
      }
    } catch (error) {
      console.warn('Failed to show in-page notification:', error);
    }
  }

  /**
   * Load extension settings
   */
  private async loadSettings(): Promise<void> {
    try {
      const { settings } = await chrome.storage.local.get(['settings']);
      this.settings = settings;
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    const defaultStats: StorageStats = {
      totalScreenshots: 0,
      totalSize: 0,
      lastSaved: 0,
      monthlyCount: 0,
      averageSize: 0,
      processingTimes: [],
    };

    const { storageStats = defaultStats } = await chrome.storage.local.get([
      'storageStats',
    ]);
    return storageStats;
  }

  /**
   * Get screenshot metadata by download ID
   */
  async getScreenshotMetadata(downloadId: number): Promise<any> {
    const { [`screenshot_${downloadId}`]: metadata } =
      await chrome.storage.local.get([`screenshot_${downloadId}`]);
    return metadata;
  }

  /**
   * Get all screenshot metadata
   */
  async getAllScreenshots(): Promise<any[]> {
    const { screenshotList = [] } = await chrome.storage.local.get([
      'screenshotList',
    ]);
    const metadataKeys = screenshotList.map((id: number) => `screenshot_${id}`);

    if (metadataKeys.length === 0) return [];

    const result = await chrome.storage.local.get(metadataKeys);
    const metadataResults = result ?? {};
    return Object.values(metadataResults);
  }
  async cleanupOldData(
    olderThanDays: number = 90
  ): Promise<{ removed: number; sizeFreed: number }> {
    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const allScreenshots = await this.getAllScreenshots();

    const toRemove = allScreenshots.filter(
      (screenshot) => screenshot.timestamp < cutoffTime
    );

    if (toRemove.length === 0) {
      return { removed: 0, sizeFreed: 0 };
    }

    // Calculate total size freed
    const sizeFreed = toRemove.reduce((total, screenshot) => {
      return total + (screenshot.fileSize || 0);
    }, 0);

    // Remove metadata
    const keysToRemove = toRemove.map(
      (screenshot) => `screenshot_${screenshot.downloadId}`
    );
    await chrome.storage.local.remove(keysToRemove);

    // Update screenshot list
    const { screenshotList = [] } = await chrome.storage.local.get([
      'screenshotList',
    ]);
    const removedIds = toRemove.map((screenshot) => screenshot.downloadId);
    const updatedList = screenshotList.filter(
      (id: number) => !removedIds.includes(id)
    );
    await chrome.storage.local.set({ screenshotList: updatedList });

    // Update storage stats
    const stats = await this.getStorageStats();
    const updatedStats: StorageStats = {
      ...stats,
      totalScreenshots: Math.max(0, stats.totalScreenshots - toRemove.length),
      totalSize: Math.max(0, stats.totalSize - sizeFreed),
    };
    await chrome.storage.local.set({ storageStats: updatedStats });

    return { removed: toRemove.length, sizeFreed };
  }

  /**
   * Export screenshot data for backup
   */
  async exportScreenshotData(): Promise<string> {
    const allScreenshots = await this.getAllScreenshots();
    const stats = await this.getStorageStats();

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      stats,
      screenshots: allScreenshots,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Check available storage space
   */
  async checkStorageSpace(): Promise<{
    available: boolean;
    usage: number;
    quota: number;
  }> {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const available = usage < quota * 0.9; // Consider 90% as limit

      return { available, usage, quota };
    } catch (error) {
      console.warn('Failed to check storage space:', error);
      return { available: true, usage: 0, quota: 0 };
    }
  }
}

// Export singleton instance
export const fileStorageManager = new FileStorageManager();

// Utility functions
export const StorageUtils = {
  /**
   * Format storage path for display
   */
  formatPath(path: string): string {
    return path.replace(/\//g, ' › ');
  },

  /**
   * Validate filename
   */
  isValidFilename(filename: string): boolean {
    const invalidChars = /[<>:"/\\|?*]/;
    return (
      !invalidChars.test(filename) &&
      filename.length > 0 &&
      filename.length <= 255
    );
  },

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .substring(0, 255);
  },

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
  },

  /**
   * Check if file is an image
   */
  isImageFile(filename: string): boolean {
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    const extension = this.getFileExtension(filename);
    return imageExtensions.includes(extension);
  },
};
