/**
 * Structured Logging System for ElectroSim
 * Provides comprehensive logging with proper levels, formatting, and contexts
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  sessionId?: string;
  boardId?: string;
  portName?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: any;
}

/**
 * Logger interface for different output implementations
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: any, context?: LogContext): void;
  fatal(message: string, error?: any, context?: LogContext): void;
}

/**
 * Console logger implementation for development
 */
export class ConsoleLogger implements ILogger {
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  error(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  fatal(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, error, context);
  }

  private log(level: LogLevel, message: string, error?: any, context?: LogContext): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? this.serializeError(error) : undefined
    };

    const formattedMessage = this.formatMessage(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        break;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level].padEnd(5);
    const contextStr = entry.context ? ` [${this.formatContext(entry.context)}]` : '';
    const errorStr = entry.error ? `\n${JSON.stringify(entry.error, null, 2)}` : '';
    
    return `${entry.timestamp} ${levelStr} ${entry.message}${contextStr}${errorStr}`;
  }

  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    
    if (context.component) parts.push(`${context.component}`);
    if (context.operation) parts.push(`${context.operation}`);
    if (context.boardId) parts.push(`board:${context.boardId}`);
    if (context.portName) parts.push(`port:${context.portName}`);
    
    return parts.join(' | ');
  }

  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...error
      };
    }
    return error;
  }
}

/**
 * File logger implementation for production
 */
export class FileLogger implements ILogger {
  private logPath: string;
  private minLevel: LogLevel;

  constructor(logPath: string, minLevel: LogLevel = LogLevel.INFO) {
    this.logPath = logPath;
    this.minLevel = minLevel;
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  error(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, error, context);
  }

  fatal(message: string, error?: any, context?: LogContext): void {
    this.log(LogLevel.FATAL, message, error, context);
  }

  private async log(level: LogLevel, message: string, error?: any, context?: LogContext): Promise<void> {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error
    };

    try {
      const fs = require('fs').promises;
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.logPath, logLine);
    } catch (writeError) {
      console.error('Failed to write to log file:', writeError);
    }
  }
}

/**
 * Multi-target logger that can write to multiple outputs
 */
export class MultiLogger implements ILogger {
  private loggers: ILogger[] = [];

  constructor(loggers: ILogger[] = []) {
    this.loggers = loggers;
  }

  addLogger(logger: ILogger): void {
    this.loggers.push(logger);
  }

  debug(message: string, context?: LogContext): void {
    this.loggers.forEach(logger => logger.debug(message, context));
  }

  info(message: string, context?: LogContext): void {
    this.loggers.forEach(logger => logger.info(message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.loggers.forEach(logger => logger.warn(message, context));
  }

  error(message: string, error?: any, context?: LogContext): void {
    this.loggers.forEach(logger => logger.error(message, error, context));
  }

  fatal(message: string, error?: any, context?: LogContext): void {
    this.loggers.forEach(logger => logger.fatal(message, error, context));
  }
}

/**
 * Logger factory and global logger management
 */
export class Logger {
  private static instance: ILogger;

  /**
   * Initialize the global logger
   */
  static initialize(logger?: ILogger): void {
    if (!logger) {
      // Default configuration based on environment
      const isDevelopment = process.env.NODE_ENV === 'development';
      const logLevel = isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
      
      if (isDevelopment) {
        this.instance = new ConsoleLogger(logLevel);
      } else {
        // In production, use both console and file logging
        const multiLogger = new MultiLogger();
        multiLogger.addLogger(new ConsoleLogger(LogLevel.WARN)); // Only warn+ to console in prod
        multiLogger.addLogger(new FileLogger('./logs/electrosim.log', logLevel));
        this.instance = multiLogger;
      }
    } else {
      this.instance = logger;
    }
  }

  /**
   * Get the global logger instance
   */
  static getInstance(): ILogger {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }

  // Convenience static methods
  static debug(message: string, context?: LogContext): void {
    this.getInstance().debug(message, context);
  }

  static info(message: string, context?: LogContext): void {
    this.getInstance().info(message, context);
  }

  static warn(message: string, context?: LogContext): void {
    this.getInstance().warn(message, context);
  }

  static error(message: string, error?: any, context?: LogContext): void {
    this.getInstance().error(message, error, context);
  }

  static fatal(message: string, error?: any, context?: LogContext): void {
    this.getInstance().fatal(message, error, context);
  }
}

// Initialize the default logger
Logger.initialize();