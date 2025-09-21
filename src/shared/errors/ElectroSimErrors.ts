/**
 * Custom Error Classes for ElectroSim
 * Provides structured error handling with proper error types and messages
 */

/**
 * Base error class for all ElectroSim errors
 */
export abstract class ElectroSimError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;
  
  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  /**
   * Get error details as JSON
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      stack: this.stack
    };
  }
}

/**
 * Simulation-related errors
 */
export class SimulationError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SIMULATION_ERROR', context);
  }
}

/**
 * Compilation-related errors
 */
export class CompilationError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'COMPILATION_ERROR', context);
  }
}

/**
 * Serial port-related errors
 */
export class SerialPortError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'SERIAL_PORT_ERROR', context);
  }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', context);
  }
}

/**
 * Hardware emulation errors
 */
export class HardwareEmulationError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'HARDWARE_EMULATION_ERROR', context);
  }
}

/**
 * File system operation errors
 */
export class FileSystemError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'FILE_SYSTEM_ERROR', context);
  }
}

/**
 * Network/API related errors
 */
export class NetworkError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends ElectroSimError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class ErrorFactory {
  /**
   * Create an error based on error type
   */
  static create(type: string, message: string, context?: Record<string, any>): ElectroSimError {
    switch (type.toLowerCase()) {
      case 'simulation':
        return new SimulationError(message, context);
      case 'compilation':
        return new CompilationError(message, context);
      case 'serialport':
        return new SerialPortError(message, context);
      case 'configuration':
        return new ConfigurationError(message, context);
      case 'hardware':
        return new HardwareEmulationError(message, context);
      case 'filesystem':
        return new FileSystemError(message, context);
      case 'network':
        return new NetworkError(message, context);
      case 'validation':
        return new ValidationError(message, context);
      default:
        return new SimulationError(message, context);
    }
  }

  /**
   * Wrap unknown errors in ElectroSim error types
   */
  static wrap(error: unknown, context?: Record<string, any>): ElectroSimError {
    if (error instanceof ElectroSimError) {
      return error;
    }
    
    if (error instanceof Error) {
      return new SimulationError(error.message, { 
        ...context,
        originalError: error.name,
        originalStack: error.stack
      });
    }
    
    return new SimulationError(
      typeof error === 'string' ? error : 'Unknown error occurred',
      { ...context, originalError: error }
    );
  }
}

/**
 * Error handler utility for consistent error processing
 */
export class ErrorHandler {
  private static readonly logger = console; // In production, this would be a proper logger
  
  /**
   * Handle and log an error appropriately
   */
  static handle(error: unknown, context?: Record<string, any>): ElectroSimError {
    const electroSimError = ErrorFactory.wrap(error, context);
    
    // Log the error
    this.logger.error(`[${electroSimError.code}] ${electroSimError.message}`, {
      context: electroSimError.context,
      stack: electroSimError.stack
    });
    
    return electroSimError;
  }

  /**
   * Handle async errors in promise chains
   */
  static async handleAsync<T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }

  /**
   * Handle sync errors
   */
  static handleSync<T>(
    operation: () => T,
    context?: Record<string, any>
  ): T {
    try {
      return operation();
    } catch (error) {
      throw this.handle(error, context);
    }
  }
}