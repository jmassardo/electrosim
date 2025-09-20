/**
 * Arduino Compiler
 * Compiles Arduino C++ code to AVR bytecode using a simplified compilation process
 * This is a basic implementation that handles common Arduino patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, spawnSync } from 'child_process';

export interface CompilationOptions {
  board: 'uno' | 'nano' | 'mega' | 'leonardo';
  fqbn: string;
  libraries: string[];
  verbose: boolean;
  outputPath?: string;
}

export interface CompilationResult {
  success: boolean;
  binarySize: number;
  hexData: Uint16Array;
  hexString: string;
  errors: CompilationError[];
  warnings: CompilationWarning[];
  memoryUsage: {
    flash: number;
    sram: number;
  };
}

export interface CompilationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  file?: string;
}

export interface CompilationWarning {
  line: number;
  column: number;
  message: string;
  file?: string;
}

/**
 * Arduino Code Compiler
 * Provides compilation services for Arduino sketches
 */
export class ArduinoCompiler {
  private arduinoCliPath: string = '';
  private tempDir: string;
  private readonly boardConfigs = {
    uno: {
      fqbn: 'arduino:avr:uno',
      mcu: 'atmega328p',
      flashSize: 32768,
      ramSize: 2048
    },
    nano: {
      fqbn: 'arduino:avr:nano',
      mcu: 'atmega328p',
      flashSize: 32768,
      ramSize: 2048
    },
    mega: {
      fqbn: 'arduino:avr:mega',
      mcu: 'atmega2560',
      flashSize: 262144,
      ramSize: 8192
    },
    leonardo: {
      fqbn: 'arduino:avr:leonardo',
      mcu: 'atmega32u4',
      flashSize: 32768,
      ramSize: 2560
    }
  };

  constructor() {
    this.tempDir = os.tmpdir();
    this.detectArduinoCli();
  }

  /**
   * Detect Arduino CLI installation
   */
  private detectArduinoCli(): void {
    // Common Arduino CLI locations
    const possiblePaths = [
      'arduino-cli',
      '/usr/local/bin/arduino-cli',
      '/opt/homebrew/bin/arduino-cli',
      process.env.ARDUINO_CLI_PATH || '',
    ];

    for (const cliPath of possiblePaths) {
      if (this.testArduinoCli(cliPath)) {
        this.arduinoCliPath = cliPath;
        break;
      }
    }
  }

  /**
   * Test if Arduino CLI is available at path
   */
  private testArduinoCli(cliPath: string): boolean {
    if (!cliPath || cliPath.trim() === '') {
      return false;
    }
    
    try {
      const result = spawnSync(cliPath, ['version'], { 
        stdio: 'pipe',
        timeout: 5000 // 5 second timeout
      });
      return result.status === 0;
    } catch (error) {
      // Silently handle any spawn errors
      return false;
    }
  }

  /**
   * Compile Arduino sketch to AVR bytecode
   */
  public async compile(
    code: string,
    options: Partial<CompilationOptions> = {}
  ): Promise<CompilationResult> {
    const config = {
      board: 'uno' as const,
      fqbn: '',
      libraries: [],
      verbose: false,
      ...options
    };

    // Set FQBN if not provided
    if (!config.fqbn) {
      config.fqbn = this.boardConfigs[config.board].fqbn;
    }

    try {
      // If Arduino CLI is not available, use mock compilation
      if (!this.arduinoCliPath) {
        return this.mockCompile(code, config);
      }

      // Create temporary sketch directory
      const sketchPath = await this.createTempSketch(code);
      
      // Compile using Arduino CLI
      const result = await this.compileWithCli(sketchPath, config);
      
      // Clean up
      await this.cleanup(sketchPath);
      
      return result;
    } catch (error) {
      return {
        success: false,
        binarySize: 0,
        hexData: new Uint16Array(0),
        hexString: '',
        errors: [{
          line: 0,
          column: 0,
          message: error instanceof Error ? error.message : 'Compilation failed',
          severity: 'error' as const
        }],
        warnings: [],
        memoryUsage: { flash: 0, sram: 0 }
      };
    }
  }

  /**
   * Create temporary Arduino sketch file
   */
  private async createTempSketch(code: string): Promise<string> {
    const sketchName = `temp_sketch_${Date.now()}`;
    const sketchDir = path.join(this.tempDir, sketchName);
    const sketchFile = path.join(sketchDir, `${sketchName}.ino`);

    await fs.promises.mkdir(sketchDir, { recursive: true });
    await fs.promises.writeFile(sketchFile, code, 'utf8');

    return sketchDir;
  }

  /**
   * Compile sketch using Arduino CLI
   */
  private async compileWithCli(
    sketchPath: string,
    config: CompilationOptions
  ): Promise<CompilationResult> {
    return new Promise((resolve) => {
      const args = [
        'compile',
        '--fqbn', config.fqbn,
        '--output-dir', path.join(sketchPath, 'build'),
        sketchPath
      ];

      if (config.verbose) {
        args.push('--verbose');
      }

      const childProcess = spawn(this.arduinoCliPath, args, {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', async (code: number | null) => {
        if (code === 0) {
          // Compilation successful
          try {
            const hexFile = path.join(sketchPath, 'build', path.basename(sketchPath) + '.ino.hex');
            const hexString = await fs.promises.readFile(hexFile, 'utf8');
            const hexData = this.parseIntelHex(hexString);
            
            const result: CompilationResult = {
              success: true,
              binarySize: hexData.length * 2,
              hexData,
              hexString,
              errors: [],
              warnings: this.parseWarnings(stdout),
              memoryUsage: this.extractMemoryUsage(stdout)
            };
            
            resolve(result);
          } catch (error) {
            resolve({
              success: false,
              binarySize: 0,
              hexData: new Uint16Array(0),
              hexString: '',
              errors: [{ line: 0, column: 0, message: 'Failed to read compiled binary', severity: 'error' }],
              warnings: [],
              memoryUsage: { flash: 0, sram: 0 }
            });
          }
        } else {
          // Compilation failed
          resolve({
            success: false,
            binarySize: 0,
            hexData: new Uint16Array(0),
            hexString: '',
            errors: this.parseErrors(stderr),
            warnings: this.parseWarnings(stderr),
            memoryUsage: { flash: 0, sram: 0 }
          });
        }
      });
    });
  }

  /**
   * Mock compilation for when Arduino CLI is not available
   */
  private mockCompile(code: string, config: CompilationOptions): CompilationResult {
    // Basic syntax checking
    const errors: CompilationError[] = [];
    const warnings: CompilationWarning[] = [];

    // Check for basic syntax errors
    if (!code.includes('void setup()')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'setup() function is required',
        severity: 'error'
      });
    }

    if (!code.includes('void loop()')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'loop() function is required',
        severity: 'error'
      });
    }

    // Check for common warnings
    if (code.includes('Serial.begin') && !code.includes('Serial.print')) {
      warnings.push({
        line: 1,
        column: 1,
        message: 'Serial initialized but not used'
      });
    }

    // Generate mock bytecode for successful compilation
    let hexData = new Uint16Array(0);
    let hexString = '';
    
    if (errors.length === 0) {
      // Generate a simple mock program
      const mockProgram = [
        0x940C, 0x0000, // JMP 0x0000 (reset vector)
        0xE005,         // LDI R16, 0x05
        0xBF0D,         // OUT DDRB, R16
        0xE505,         // LDI R16, 0x05
        0xBF0E,         // OUT PORTB, R16
        0xCFFE,         // RJMP -2 (infinite loop)
      ];
      
      hexData = new Uint16Array(mockProgram);
      hexString = this.generateIntelHex(hexData);
    }

    const boardConfig = this.boardConfigs[config.board];
    
    return {
      success: errors.length === 0,
      binarySize: hexData.length * 2,
      hexData,
      hexString,
      errors,
      warnings,
      memoryUsage: {
        flash: Math.min(hexData.length * 2, boardConfig.flashSize),
        sram: 128 // Mock SRAM usage
      }
    };
  }

  /**
   * Parse Intel HEX format to binary data
   */
  private parseIntelHex(hexString: string): Uint16Array {
    const lines = hexString.split('\n').filter(line => line.trim().length > 0);
    const data: number[] = [];
    
    for (const line of lines) {
      if (!line.startsWith(':')) continue;
      
      const byteCount = parseInt(line.substr(1, 2), 16);
      const address = parseInt(line.substr(3, 4), 16);
      const recordType = parseInt(line.substr(7, 2), 16);
      
      if (recordType === 0) { // Data record
        for (let i = 0; i < byteCount; i++) {
          const byte = parseInt(line.substr(9 + i * 2, 2), 16);
          data[address + i] = byte;
        }
      }
    }
    
    // Convert to 16-bit words
    const result = new Uint16Array(Math.ceil(data.length / 2));
    for (let i = 0; i < data.length; i += 2) {
      const low = data[i] || 0;
      const high = data[i + 1] || 0;
      result[i / 2] = low | (high << 8);
    }
    
    return result;
  }

  /**
   * Generate Intel HEX format from binary data
   */
  private generateIntelHex(data: Uint16Array): string {
    let hex = '';
    
    // Convert 16-bit words to bytes
    const bytes: number[] = [];
    for (let i = 0; i < data.length; i++) {
      bytes[i * 2] = data[i] & 0xFF;
      bytes[i * 2 + 1] = (data[i] >> 8) & 0xFF;
    }
    
    // Generate HEX records (16 bytes per line)
    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const byteCount = chunk.length;
      const address = i;
      
      let line = `:${byteCount.toString(16).padStart(2, '0').toUpperCase()}`;
      line += `${address.toString(16).padStart(4, '0').toUpperCase()}`;
      line += '00'; // Record type (data)
      
      let checksum = byteCount + (address >> 8) + (address & 0xFF);
      
      for (const byte of chunk) {
        line += byte.toString(16).padStart(2, '0').toUpperCase();
        checksum += byte;
      }
      
      checksum = (0x100 - (checksum & 0xFF)) & 0xFF;
      line += checksum.toString(16).padStart(2, '0').toUpperCase();
      
      hex += line + '\n';
    }
    
    // End of file record
    hex += ':00000001FF\n';
    
    return hex;
  }

  /**
   * Parse compilation errors from stderr
   */
  private parseErrors(stderr: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = stderr.split('\n');
    
    for (const line of lines) {
      // Match GCC error format: file:line:column: error: message
      const match = line.match(/(.+):(\d+):(\d+):\s*(error|warning):\s*(.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          severity: match[4] as 'error' | 'warning',
          message: match[5]
        });
      }
    }
    
    return errors;
  }

  /**
   * Parse compilation warnings from output
   */
  private parseWarnings(output: string): CompilationWarning[] {
    const warnings: CompilationWarning[] = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Match GCC warning format
      const match = line.match(/(.+):(\d+):(\d+):\s*warning:\s*(.+)/);
      if (match) {
        warnings.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: match[4]
        });
      }
    }
    
    return warnings;
  }

  /**
   * Extract memory usage from compilation output
   */
  private extractMemoryUsage(output: string): { flash: number; sram: number } {
    // Parse avr-size output
    const sizeMatch = output.match(/(\d+)\s+(\d+)\s+(\d+)/);
    if (sizeMatch) {
      return {
        flash: parseInt(sizeMatch[1]) + parseInt(sizeMatch[2]),
        sram: parseInt(sizeMatch[2]) + parseInt(sizeMatch[3])
      };
    }
    
    return { flash: 0, sram: 0 };
  }

  /**
   * Clean up temporary files
   */
  private async cleanup(sketchPath: string): Promise<void> {
    try {
      await fs.promises.rmdir(sketchPath, { recursive: true });
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error);
    }
  }

  /**
   * Check if Arduino CLI is available
   */
  public isArduinoCliAvailable(): boolean {
    return this.arduinoCliPath !== '';
  }

  /**
   * Get supported board configurations
   */
  public getSupportedBoards(): Array<{name: string, fqbn: string, mcu: string}> {
    return Object.entries(this.boardConfigs).map(([name, config]) => ({
      name,
      fqbn: config.fqbn,
      mcu: config.mcu
    }));
  }

  /**
   * Validate Arduino code syntax (basic checks)
   */
  public validateSyntax(code: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check for required functions
    if (!code.includes('void setup()') && !code.includes('void setup(')) {
      errors.push('Missing required setup() function');
    }
    
    if (!code.includes('void loop()') && !code.includes('void loop(')) {
      errors.push('Missing required loop() function');
    }
    
    // Check for balanced braces
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push('Unbalanced braces - check your code structure');
    }
    
    // Check for balanced parentheses
    let parenBalance = 0;
    for (const char of code) {
      if (char === '(') parenBalance++;
      if (char === ')') parenBalance--;
      if (parenBalance < 0) {
        errors.push('Unbalanced parentheses');
        break;
      }
    }
    if (parenBalance > 0) {
      errors.push('Unbalanced parentheses');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}