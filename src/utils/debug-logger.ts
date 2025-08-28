/**
 * Centralized debugging and logging utility for SnapInsights
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDebugMode = false;

  constructor() {
    // Enable debug mode in development
    this.isDebugMode =
      (typeof chrome !== 'undefined' &&
        chrome.runtime?.getManifest()?.name?.includes('Dev')) ||
      (typeof window !== 'undefined' &&
        window.location?.hostname === 'localhost');
  }

  private addLog(
    level: LogLevel,
    component: string,
    message: string,
    data?: any
  ) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
    };

    this.logs.push(entry);

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with component prefix
    const prefix = `INSIGHT-CLIP[${component}]:`;
    const args = data ? [prefix, message, data] : [prefix, message];

    switch (level) {
      case 'debug':
        if (this.isDebugMode) console.debug(...args);
        break;
      case 'info':
        console.log(...args);
        break;
      case 'warn':
        console.warn(...args);
        break;
      case 'error':
        console.error(...args);
        break;
    }
  }

  debug(component: string, message: string, data?: any) {
    this.addLog('debug', component, message, data);
  }

  info(component: string, message: string, data?: any) {
    this.addLog('info', component, message, data);
  }

  warn(component: string, message: string, data?: any) {
    this.addLog('warn', component, message, data);
  }

  error(component: string, message: string, data?: any) {
    this.addLog('error', component, message, data);
  }

  // Get recent logs for debugging
  getRecentLogs(count = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by component
  getLogsByComponent(component: string, count = 50): LogEntry[] {
    return this.logs.filter((log) => log.component === component).slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel, count = 50): LogEntry[] {
    return this.logs.filter((log) => log.level === level).slice(-count);
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    console.log('INSIGHT-CLIP: Debug logs cleared');
  }

  // Export logs for debugging
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Enable/disable debug mode
  setDebugMode(enabled: boolean) {
    this.isDebugMode = enabled;
    console.log(`INSIGHT-CLIP: Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create singleton instance
export const logger = new DebugLogger();

// Convenience functions for common components
export const popupLogger = {
  debug: (msg: string, data?: any) => logger.debug('POPUP', msg, data),
  info: (msg: string, data?: any) => logger.info('POPUP', msg, data),
  warn: (msg: string, data?: any) => logger.warn('POPUP', msg, data),
  error: (msg: string, data?: any) => logger.error('POPUP', msg, data),
};

export const backgroundLogger = {
  debug: (msg: string, data?: any) => logger.debug('BACKGROUND', msg, data),
  info: (msg: string, data?: any) => logger.info('BACKGROUND', msg, data),
  warn: (msg: string, data?: any) => logger.warn('BACKGROUND', msg, data),
  error: (msg: string, data?: any) => logger.error('BACKGROUND', msg, data),
};

export const contentLogger = {
  debug: (msg: string, data?: any) => logger.debug('CONTENT', msg, data),
  info: (msg: string, data?: any) => logger.info('CONTENT', msg, data),
  warn: (msg: string, data?: any) => logger.warn('CONTENT', msg, data),
  error: (msg: string, data?: any) => logger.error('CONTENT', msg, data),
};

export const stateLogger = {
  debug: (msg: string, data?: any) => logger.debug('STATE', msg, data),
  info: (msg: string, data?: any) => logger.info('STATE', msg, data),
  warn: (msg: string, data?: any) => logger.warn('STATE', msg, data),
  error: (msg: string, data?: any) => logger.error('STATE', msg, data),
};

// Make logger available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).insightClipLogger = logger;
}
