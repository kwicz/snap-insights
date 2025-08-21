import { FileStorageManager, StorageUtils } from '../src/utils/storage';
import {
  mockChromeExtension,
  createMockScreenshot,
} from '../src/utils/test-utils';

// Mock navigator.storage
global.navigator = {
  ...global.navigator,
  storage: {
    estimate: jest.fn().mockResolvedValue({
      usage: 1000000,
      quota: 10000000,
    }),
  },
} as any;

describe('FileStorageManager', () => {
  let storageManager: FileStorageManager;

  beforeEach(() => {
    mockChromeExtension.resetMocks();
    storageManager = new FileStorageManager();
  });

  describe('Screenshot Saving', () => {
    it('should save screenshot with default organization', async () => {
      const screenshotData = createMockScreenshot({
        url: 'https://example.com/page',
        timestamp: new Date('2023-08-20T10:30:00Z').getTime(),
      });

      (chrome.downloads.download as jest.Mock).mockResolvedValue(123);
      mockChromeExtension.mockStorageGet({});

      const result = await storageManager.saveScreenshot(screenshotData);

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe(123);
      expect(result.filename).toMatch(
        /^ux-screenshot_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_example-com\.png$/
      );
      expect(result.fullPath).toContain('UX-Research-Screenshots');
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: screenshotData.dataUrl,
        filename: expect.stringContaining('UX-Research-Screenshots'),
        saveAs: false,
        conflictAction: 'uniquify',
      });
    });

    it('should organize screenshots by month', async () => {
      const screenshotData = createMockScreenshot({
        url: 'https://example.com',
        timestamp: new Date('2023-08-20T10:30:00Z').getTime(),
      });

      (chrome.downloads.download as jest.Mock).mockResolvedValue(124);
      mockChromeExtension.mockStorageGet({});

      const result = await storageManager.saveScreenshot(screenshotData, {
        organizeByMonth: true,
      });

      expect(result.fullPath).toContain('2023/08-August');
      expect(result.fullPath).toContain('by-domain/example-com');
    });

    it('should use custom path when provided', async () => {
      const screenshotData = createMockScreenshot();
      const customPath = 'Custom-Screenshots';

      (chrome.downloads.download as jest.Mock).mockResolvedValue(125);
      mockChromeExtension.mockStorageGet({});

      const result = await storageManager.saveScreenshot(screenshotData, {
        customPath,
      });

      expect(result.fullPath).toContain(customPath);
    });

    it('should use custom filename when provided', async () => {
      const screenshotData = createMockScreenshot();
      const customFilename = 'custom-screenshot.png';

      (chrome.downloads.download as jest.Mock).mockResolvedValue(126);
      mockChromeExtension.mockStorageGet({});

      const result = await storageManager.saveScreenshot(screenshotData, {
        filename: customFilename,
      });

      expect(result.filename).toBe(customFilename);
    });

    it('should handle download errors gracefully', async () => {
      const screenshotData = createMockScreenshot();

      (chrome.downloads.download as jest.Mock).mockRejectedValue(
        new Error('Download failed')
      );

      const result = await storageManager.saveScreenshot(screenshotData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Download failed');
    });
  });

  describe('Metadata Management', () => {
    it('should save metadata with screenshot', async () => {
      const screenshotData = createMockScreenshot({
        annotation: 'Test annotation',
        voiceNote: 'Test voice note',
      });

      (chrome.downloads.download as jest.Mock).mockResolvedValue(127);
      mockChromeExtension.mockStorageGet({ screenshotList: [] });

      await storageManager.saveScreenshot(screenshotData, {
        saveMetadata: true,
      });

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [`screenshot_127`]: expect.objectContaining({
          downloadId: 127,
          url: screenshotData.url,
          annotation: 'Test annotation',
          voiceNote: 'Test voice note',
        }),
      });
    });

    it('should maintain screenshot list', async () => {
      const screenshotData = createMockScreenshot();

      (chrome.downloads.download as jest.Mock).mockResolvedValue(128);
      mockChromeExtension.mockStorageGet({ screenshotList: [125, 126, 127] });

      await storageManager.saveScreenshot(screenshotData);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        screenshotList: [125, 126, 127, 128],
      });
    });

    it('should limit screenshot list to 1000 items', async () => {
      const screenshotData = createMockScreenshot();
      const longList = Array.from({ length: 1000 }, (_, i) => i + 1);

      (chrome.downloads.download as jest.Mock).mockResolvedValue(1001);
      mockChromeExtension.mockStorageGet({ screenshotList: longList });

      await storageManager.saveScreenshot(screenshotData);

      // Should remove old items and add new one
      expect(chrome.storage.local.remove).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        screenshotList: expect.arrayContaining([1001]),
      });
    });
  });

  describe('Storage Statistics', () => {
    it('should update storage statistics', async () => {
      const screenshotData = createMockScreenshot();

      (chrome.downloads.download as jest.Mock).mockResolvedValue(129);
      mockChromeExtension.mockStorageGet({
        storageStats: {
          totalScreenshots: 5,
          totalSize: 1000000,
          lastSaved: Date.now() - 86400000, // 1 day ago
          monthlyCount: 3,
        },
      });

      await storageManager.saveScreenshot(screenshotData);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        storageStats: expect.objectContaining({
          totalScreenshots: 6,
          totalSize: expect.any(Number),
          monthlyCount: expect.any(Number),
        }),
      });
    });

    it('should reset monthly count for new month', async () => {
      const screenshotData = createMockScreenshot();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      (chrome.downloads.download as jest.Mock).mockResolvedValue(130);
      mockChromeExtension.mockStorageGet({
        storageStats: {
          totalScreenshots: 5,
          totalSize: 1000000,
          lastSaved: lastMonth.getTime(),
          monthlyCount: 10,
        },
      });

      await storageManager.saveScreenshot(screenshotData);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        storageStats: expect.objectContaining({
          monthlyCount: 1, // Reset for new month
        }),
      });
    });
  });

  describe('Data Retrieval', () => {
    it('should get storage statistics', async () => {
      const mockStats = {
        totalScreenshots: 10,
        totalSize: 5000000,
        lastSaved: Date.now(),
        monthlyCount: 3,
      };

      mockChromeExtension.mockStorageGet({ storageStats: mockStats });

      const stats = await storageManager.getStorageStats();
      expect(stats).toEqual(mockStats);
    });

    it('should get screenshot metadata', async () => {
      const mockMetadata = {
        downloadId: 123,
        url: 'https://example.com',
        timestamp: Date.now(),
      };

      mockChromeExtension.mockStorageGet({ screenshot_123: mockMetadata });

      const metadata = await storageManager.getScreenshotMetadata(123);
      expect(metadata).toEqual(mockMetadata);
    });

    it('should get all screenshots', async () => {
      const mockScreenshots = [
        { downloadId: 123, url: 'https://example.com' },
        { downloadId: 124, url: 'https://test.com' },
      ];

      mockChromeExtension.mockStorageGet({
        screenshotList: [123, 124],
        screenshot_123: mockScreenshots[0],
        screenshot_124: mockScreenshots[1],
      });

      const screenshots = await storageManager.getAllScreenshots();
      expect(screenshots).toEqual(mockScreenshots);
    });
  });

  describe('Data Cleanup', () => {
    it('should clean up old screenshots', async () => {
      const oldTimestamp = Date.now() - 100 * 24 * 60 * 60 * 1000; // 100 days ago
      const recentTimestamp = Date.now() - 10 * 24 * 60 * 60 * 1000; // 10 days ago

      const mockScreenshots = [
        { downloadId: 123, timestamp: oldTimestamp, fileSize: 1000 },
        { downloadId: 124, timestamp: recentTimestamp, fileSize: 2000 },
      ];

      mockChromeExtension.mockStorageGet({
        screenshotList: [123, 124],
        screenshot_123: mockScreenshots[0],
        screenshot_124: mockScreenshots[1],
        storageStats: {
          totalScreenshots: 2,
          totalSize: 3000,
          lastSaved: Date.now(),
          monthlyCount: 2,
        },
      });

      const result = await storageManager.cleanupOldData(90);

      expect(result.removed).toBe(1);
      expect(result.sizeFreed).toBe(1000);
      expect(chrome.storage.local.remove).toHaveBeenCalledWith([
        'screenshot_123',
      ]);
    });
  });

  describe('Storage Space Management', () => {
    it('should check available storage space', async () => {
      const spaceInfo = await storageManager.checkStorageSpace();

      expect(spaceInfo.available).toBe(true);
      expect(spaceInfo.usage).toBe(1000000);
      expect(spaceInfo.quota).toBe(10000000);
    });

    it('should detect low storage space', async () => {
      (navigator.storage.estimate as jest.Mock).mockResolvedValue({
        usage: 9500000, // 95% of quota
        quota: 10000000,
      });

      const spaceInfo = await storageManager.checkStorageSpace();
      expect(spaceInfo.available).toBe(false);
    });
  });

  describe('Data Export', () => {
    it('should export screenshot data', async () => {
      const mockScreenshots = [{ downloadId: 123, url: 'https://example.com' }];
      const mockStats = {
        totalScreenshots: 1,
        totalSize: 1000,
        lastSaved: Date.now(),
        monthlyCount: 1,
      };

      mockChromeExtension.mockStorageGet({
        screenshotList: [123],
        screenshot_123: mockScreenshots[0],
        storageStats: mockStats,
      });

      const exportData = await storageManager.exportScreenshotData();
      const parsed = JSON.parse(exportData);

      expect(parsed.screenshots).toEqual(mockScreenshots);
      expect(parsed.stats).toEqual(mockStats);
      expect(parsed.version).toBe('1.0.0');
    });
  });
});

describe('StorageUtils', () => {
  describe('Path Formatting', () => {
    it('should format storage path for display', () => {
      const path =
        'UX-Research-Screenshots/2023/08-August/by-domain/example-com';
      const formatted = StorageUtils.formatPath(path);
      expect(formatted).toBe(
        'UX-Research-Screenshots › 2023 › 08-August › by-domain › example-com'
      );
    });
  });

  describe('Filename Validation', () => {
    it('should validate correct filenames', () => {
      expect(StorageUtils.isValidFilename('screenshot.png')).toBe(true);
      expect(StorageUtils.isValidFilename('ux-screenshot_2023-08-20.png')).toBe(
        true
      );
    });

    it('should reject invalid filenames', () => {
      expect(StorageUtils.isValidFilename('file<name>.png')).toBe(false);
      expect(StorageUtils.isValidFilename('file|name.png')).toBe(false);
      expect(StorageUtils.isValidFilename('')).toBe(false);
    });

    it('should sanitize filenames', () => {
      const invalid = 'file<name>:with|invalid*chars?.png';
      const sanitized = StorageUtils.sanitizeFilename(invalid);
      expect(sanitized).toBe('file-name--with-invalid-chars-.png');
    });
  });

  describe('File Extension Handling', () => {
    it('should get file extension', () => {
      expect(StorageUtils.getFileExtension('screenshot.png')).toBe('png');
      expect(StorageUtils.getFileExtension('image.jpeg')).toBe('jpeg');
      expect(StorageUtils.getFileExtension('noextension')).toBe('');
    });

    it('should identify image files', () => {
      expect(StorageUtils.isImageFile('screenshot.png')).toBe(true);
      expect(StorageUtils.isImageFile('image.jpg')).toBe(true);
      expect(StorageUtils.isImageFile('document.pdf')).toBe(false);
    });
  });
});
