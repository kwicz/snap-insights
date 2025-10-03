/**
 * Journey mode service for tracking user interactions and collecting screenshots
 * Extracted from background.ts for better code organization
 */

import { ScreenshotData, JourneyState, JourneyScreenshot } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';
import { screenshotService } from './screenshot-service';
import { eventBus } from '../../shared/services/event-bus';

const MAX_JOURNEY_SCREENSHOTS = 100;
const STORAGE_KEY_JOURNEY = 'journeyState';

/**
 * Journey tracking and management service
 */
export class JourneyService {
  /**
   * Add screenshot to current journey
   */
  async addJourneyScreenshot(
    screenshotData: ScreenshotData,
    elementInfo?: any
  ): Promise<{
    success: boolean;
    journeyState?: JourneyState;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Adding screenshot to journey:', screenshotData);

      // Get current journey state
      const currentState = await this.getJourneyState();

      backgroundLogger.debug('Current journey state when adding screenshot:', {
        success: currentState.success,
        hasJourneyState: !!currentState.journeyState,
        isActive: currentState.journeyState?.isActive,
        screenshotCount: currentState.journeyState?.screenshots?.length,
      });

      if (!currentState.success) {
        backgroundLogger.error('Failed to retrieve journey state');
        return {
          success: false,
          error: 'Failed to retrieve journey state',
        };
      }

      if (!currentState.journeyState || !currentState.journeyState.isActive) {
        backgroundLogger.warn('No active journey found', {
          hasJourneyState: !!currentState.journeyState,
          isActive: currentState.journeyState?.isActive,
        });
        return {
          success: false,
          error: 'No active journey to add screenshot to',
        };
      }

      // Check screenshot limit
      const currentCount = currentState.journeyState.screenshots.length;
      if (currentCount >= MAX_JOURNEY_SCREENSHOTS) {
        backgroundLogger.warn(`Journey screenshot limit reached (${MAX_JOURNEY_SCREENSHOTS})`);
        return {
          success: false,
          error: `Maximum of ${MAX_JOURNEY_SCREENSHOTS} screenshots per journey`,
        };
      }

      // Create journey screenshot entry
      const journeyScreenshot: JourneyScreenshot = {
        id: `screenshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sequence: currentCount + 1,
        dataUrl: screenshotData.dataUrl,
        timestamp: screenshotData.timestamp,
        url: screenshotData.url,
        coordinates: screenshotData.coordinates,
        annotation: screenshotData.annotation,
        elementInfo: elementInfo || null,
      };

      // Update journey state
      const updatedState: JourneyState = {
        ...currentState.journeyState,
        screenshots: [...currentState.journeyState.screenshots, journeyScreenshot],
      };

      // Save updated state
      await chrome.storage.local.set({
        [STORAGE_KEY_JOURNEY]: updatedState,
      });

      // Update badge with count
      await this.updateJourneyBadge(updatedState.screenshots.length);

      // Emit journey screenshot added event
      eventBus.emit('journey:screenshot:added', {
        screenshot: journeyScreenshot,
        totalCount: updatedState.screenshots.length,
      });

      backgroundLogger.info(`Journey screenshot added. Count: ${updatedState.screenshots.length}`);

      return {
        success: true,
        journeyState: updatedState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Handle Chrome storage quota errors silently to avoid cluttering Extensions errors
      if (errorMessage.includes('kQuotaBytes quota exceeded') || errorMessage.includes('QuotaExceededError')) {
        backgroundLogger.info('Journey screenshot storage quota exceeded - user taking screenshots too quickly');
        return {
          success: false,
          error: 'Storage temporarily unavailable - please wait a moment',
        };
      }

      backgroundLogger.error('Failed to add journey screenshot:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Start a new journey
   */
  async startJourney(): Promise<{
    success: boolean;
    journeyState?: JourneyState;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Starting new journey');

      // Create new journey state
      const journeyState: JourneyState = {
        isActive: true,
        startTime: Date.now(),
        endTime: undefined,
        screenshots: [],
      };

      // Save to storage
      await chrome.storage.local.set({
        [STORAGE_KEY_JOURNEY]: journeyState,
      });

      // Update badge
      await this.updateJourneyBadge(0);

      // Emit journey started event
      eventBus.emit('journey:started', { journeyState });

      backgroundLogger.info('Journey started successfully');

      return {
        success: true,
        journeyState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to start journey:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Stop current journey
   */
  async stopJourney(): Promise<{
    success: boolean;
    journeyState?: JourneyState;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Stopping journey');

      // Get current state
      const currentState = await this.getJourneyState();

      if (!currentState.journeyState?.isActive) {
        return {
          success: false,
          error: 'No active journey to stop',
        };
      }

      // Update state to stopped
      const stoppedState: JourneyState = {
        ...currentState.journeyState,
        isActive: false,
        endTime: Date.now(),
      };

      // Save to storage
      await chrome.storage.local.set({
        [STORAGE_KEY_JOURNEY]: stoppedState,
      });

      // Clear badge
      await chrome.action.setBadgeText({ text: '' });

      // Emit journey stopped event
      eventBus.emit('journey:stopped', { journeyState: stoppedState });

      backgroundLogger.info(`Journey stopped. Total screenshots: ${stoppedState.screenshots.length}`);

      return {
        success: true,
        journeyState: stoppedState,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to stop journey:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Save journey collection as downloadable files
   */
  async saveJourneyCollection(): Promise<{
    success: boolean;
    downloadIds?: number[];
    error?: string;
  }> {
    try {
      backgroundLogger.info('Saving journey collection');

      // Get journey state
      const currentState = await this.getJourneyState();

      backgroundLogger.debug('Current journey state:', currentState);

      if (!currentState.success) {
        return {
          success: false,
          error: currentState.error || 'Failed to retrieve journey state',
        };
      }

      // Check if journey state exists and has screenshots
      const journeyState = currentState.journeyState;

      if (!journeyState) {
        backgroundLogger.warn('No journey state found');
        return {
          success: false,
          error: 'No active journey found',
        };
      }

      if (!journeyState.isActive && journeyState.screenshots.length === 0) {
        backgroundLogger.warn('Journey is not active and has no screenshots');
        return {
          success: false,
          error: 'No journey screenshots to save',
        };
      }

      if (journeyState.screenshots.length === 0) {
        backgroundLogger.warn('Journey has no screenshots');
        return {
          success: false,
          error: 'No journey screenshots to save. Take some screenshots first.',
        };
      }
      const downloadIds: number[] = [];

      // Generate folder name with journey info and primary domain
      const startDate = new Date(journeyState.startTime || Date.now())
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);

      // Get the primary domain from screenshots
      const urls = journeyState.screenshots.map(s => s.url).filter(Boolean);
      const primaryDomain = urls.length > 0
        ? new URL(urls[0]).hostname.replace(/^www\./, '')
        : 'journey';

      // Create folder name
      const folderName = `journey_${primaryDomain}_${startDate}`;

      // Save each screenshot with URL-based naming
      for (const screenshot of journeyState.screenshots) {
        try {
          // Extract domain from URL for filename
          let urlPart = 'screenshot';
          if (screenshot.url) {
            try {
              const url = new URL(screenshot.url);
              urlPart = url.hostname.replace(/^www\./, '').replace(/[^a-zA-Z0-9-]/g, '_');
            } catch {
              urlPart = 'screenshot';
            }
          }

          // Create filename with URL, timestamp and sequence
          const timestamp = new Date(screenshot.timestamp)
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(11, -5); // Get time portion only

          const filename = `${folderName}/${urlPart}_${timestamp}_${screenshot.sequence.toString().padStart(3, '0')}.png`;

          const downloadId = await chrome.downloads.download({
            url: screenshot.dataUrl,
            filename: filename,
            saveAs: false,
          });

          downloadIds.push(downloadId);
          backgroundLogger.debug(`Journey screenshot saved: ${filename}`);
        } catch (downloadError) {
          backgroundLogger.warn(`Failed to save screenshot ${screenshot.id}:`, downloadError);
          // Continue with other screenshots
        }
      }

      // Create journey metadata file
      try {
        const metadata = {
          journeyInfo: {
            startTime: journeyState.startTime,
            endTime: journeyState.endTime || Date.now(),
            screenshotCount: journeyState.screenshots.length,
            duration: (journeyState.endTime || Date.now()) - (journeyState.startTime || 0),
          },
          screenshots: journeyState.screenshots.map(screenshot => ({
            id: screenshot.id,
            sequence: screenshot.sequence,
            timestamp: screenshot.timestamp,
            url: screenshot.url,
            coordinates: screenshot.coordinates,
            annotation: screenshot.annotation,
            elementInfo: screenshot.elementInfo,
          })),
        };

        const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
          type: 'application/json',
        });

        const metadataUrl = URL.createObjectURL(metadataBlob);
        const metadataDownloadId = await chrome.downloads.download({
          url: metadataUrl,
          filename: `${folderName}/journey_metadata.json`,
          saveAs: false,
        });

        downloadIds.push(metadataDownloadId);
      } catch (metadataError) {
        backgroundLogger.warn('Failed to save journey metadata:', metadataError);
        // Don't fail the entire operation for metadata
      }

      // Emit collection saved event
      eventBus.emit('journey:collection:saved', {
        downloadIds,
        totalFiles: downloadIds.length,
      });

      backgroundLogger.info(`Journey collection saved: ${downloadIds.length} files downloaded`);

      return {
        success: true,
        downloadIds,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to save journey collection:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current journey state
   */
  async getJourneyState(): Promise<{
    success: boolean;
    journeyState?: JourneyState;
    error?: string;
  }> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY_JOURNEY);
      const journeyState = result[STORAGE_KEY_JOURNEY];

      // Return undefined if no journey state exists in storage
      // Don't create a fake empty state
      return {
        success: true,
        journeyState: journeyState || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to get journey state:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Clear journey data (cleanup)
   */
  async clearJourney(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      backgroundLogger.info('Clearing journey data');

      await chrome.storage.local.remove(STORAGE_KEY_JOURNEY);
      await chrome.action.setBadgeText({ text: '' });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to clear journey:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get journey statistics
   */
  async getJourneyStats(): Promise<{
    success: boolean;
    stats?: {
      totalScreenshots: number;
      journeyDuration?: number;
      isActive: boolean;
      averageTimeBetweenShots?: number;
      uniqueUrls: number;
    };
    error?: string;
  }> {
    try {
      const stateResult = await this.getJourneyState();

      if (!stateResult.success || !stateResult.journeyState) {
        return {
          success: false,
          error: 'Could not get journey state',
        };
      }

      const journey = stateResult.journeyState;
      const screenshots = journey.screenshots;

      // Calculate stats
      const totalScreenshots = screenshots.length;
      const journeyDuration = journey.endTime && journey.startTime
        ? journey.endTime - journey.startTime
        : journey.isActive && journey.startTime
          ? Date.now() - journey.startTime
          : undefined;

      const uniqueUrls = new Set(screenshots.map(s => s.url)).size;

      // Find the most recent screenshot timestamp
      const lastCaptured = screenshots.length > 0
        ? Math.max(...screenshots.map(s => s.timestamp))
        : undefined;

      let averageTimeBetweenShots: number | undefined;
      if (screenshots.length > 1) {
        const times = screenshots.map(s => s.timestamp).sort((a, b) => a - b);
        const intervals = times.slice(1).map((time, index) => time - times[index]);
        averageTimeBetweenShots = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      }

      const stats = {
        totalScreenshots,
        journeyDuration,
        isActive: journey.isActive,
        averageTimeBetweenShots,
        uniqueUrls,
        lastCaptured,
      };

      return {
        success: true,
        stats,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to get journey stats:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Update extension badge with journey progress
   */
  private async updateJourneyBadge(count: number): Promise<void> {
    try {
      if (count > 0) {
        await chrome.action.setBadgeText({
          text: count > 99 ? '99+' : count.toString()
        });
        await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
        await chrome.action.setTitle({
          title: `SnapInsights - Journey Mode (${count} screenshot${count !== 1 ? 's' : ''})`
        });
      } else {
        await chrome.action.setBadgeText({ text: 'J' });
        await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
        await chrome.action.setTitle({ title: 'SnapInsights - Journey Mode Active' });
      }
    } catch (error) {
      backgroundLogger.warn('Failed to update journey badge:', error);
    }
  }

  /**
   * Validate journey screenshot before adding
   */
  private validateJourneyScreenshot(screenshot: Partial<JourneyScreenshot>): boolean {
    return !!(
      screenshot.dataUrl &&
      screenshot.timestamp &&
      screenshot.url &&
      screenshot.coordinates
    );
  }

  /**
   * Clean up old journey data (maintenance)
   */
  async cleanupOldJourneys(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const currentState = await this.getJourneyState();

      if (!currentState.success || !currentState.journeyState) {
        return;
      }

      const journey = currentState.journeyState;
      const now = Date.now();

      // Only cleanup inactive journeys older than maxAge
      if (!journey.isActive && journey.endTime && (now - journey.endTime > maxAge)) {
        await this.clearJourney();
        backgroundLogger.info('Cleaned up old journey data');
      }
    } catch (error) {
      backgroundLogger.warn('Failed to cleanup old journeys:', error);
    }
  }
}

// Export singleton instance
export const journeyService = new JourneyService();