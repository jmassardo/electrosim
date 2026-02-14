/**
 * Arduino C++ Parser
 * Handles parsing and validation of Arduino C++ source code
 */

export interface ParseResult {
  success: boolean;
  includes: string[];
  functions: ParsedFunction[];
  variables: ParsedVariable[];
  errors: SyntaxError[];
  warnings: ParsedWarning[];
}

export interface ParsedFunction {
  name: string;
  returnType: string;
  parameters: Parameter[];
  body: string;
  line: number;
  column: number;
}

export interface ParsedVariable {
  name: string;
  type: string;
  value?: string;
  isConst: boolean;
  line: number;
  column: number;
}

export interface Parameter {
  name: string;
  type: string;
  defaultValue?: string;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
}

export interface ParsedWarning {
  line: number;
  column: number;
  message: string;
  code?: string;
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  suggestion?: string;
}

/**
 * Arduino C++ Parser and Syntax Validator
 */
export class ArduinoParser {
  private readonly arduinoFunctions = [
    // Digital I/O
    'pinMode', 'digitalWrite', 'digitalRead',
    // Analog I/O  
    'analogRead', 'analogReference', 'analogWrite',
    // Advanced I/O
    'tone', 'noTone', 'shiftOut', 'shiftIn', 'pulseIn',
    // Time
    'millis', 'micros', 'delay', 'delayMicroseconds',
    // Math
    'min', 'max', 'abs', 'constrain', 'map', 'pow', 'sqrt',
    // Trigonometry
    'sin', 'cos', 'tan',
    // Characters
    'isAlphaNumeric', 'isAlpha', 'isAscii', 'isWhitespace',
    // Random Numbers
    'randomSeed', 'random',
    // Bits and Bytes
    'lowByte', 'highByte', 'bitRead', 'bitWrite', 'bitSet', 'bitClear', 'bit',
    // External Interrupts
    'attachInterrupt', 'detachInterrupt',
    // Interrupts
    'interrupts', 'noInterrupts'
  ];

  private readonly requiredFunctions = ['setup', 'loop'];
  private readonly arduinoConstants = [
    'INPUT', 'OUTPUT', 'INPUT_PULLUP',
    'HIGH', 'LOW',
    'LED_BUILTIN',
    'A0', 'A1', 'A2', 'A3', 'A4', 'A5'
  ];

  /**
   * Parse Arduino source code
   */
  public parse(sourceCode: string): ParseResult {
    const lines = sourceCode.split('\n');
    const includes: string[] = [];
    const functions: ParsedFunction[] = [];
    const variables: ParsedVariable[] = [];
    const errors: SyntaxError[] = [];
    const warnings: ParsedWarning[] = [];

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      const lineNumber = lineNum + 1;

      // Skip empty lines and comments
      if (!line || line.startsWith('//') || line.startsWith('/*')) {
        continue;
      }

      try {
        // Parse includes
        const includeMatch = line.match(/^\s*#include\s*[<"](.*?)[>"]/);
        if (includeMatch) {
          includes.push(includeMatch[1]);
          continue;
        }

        // Parse function definitions
        const functionMatch = line.match(/^\s*(\w+)\s+(\w+)\s*\([^)]*\)\s*\{?/);
        if (functionMatch) {
          const returnType = functionMatch[1];
          const functionName = functionMatch[2];
          
          // Extract function body (simplified)
          const bodyStart = sourceCode.indexOf(line) + line.length;
          const bodyEnd = this.findMatchingBrace(sourceCode, bodyStart);
          const body = sourceCode.substring(bodyStart, bodyEnd);

          functions.push({
            name: functionName,
            returnType,
            parameters: this.parseParameters(line),
            body,
            line: lineNumber,
            column: 1
          });
          continue;
        }

        // Parse variable declarations
        const varMatch = line.match(/^\s*(const\s+)?(\w+)\s+(\w+)(?:\s*=\s*([^;]+))?\s*;/);
        if (varMatch) {
          const isConst = !!varMatch[1];
          const type = varMatch[2];
          const name = varMatch[3];
          const value = varMatch[4];

          variables.push({
            name,
            type,
            value: value?.trim(),
            isConst,
            line: lineNumber,
            column: 1
          });
          continue;
        }

      } catch (error) {
        errors.push({
          line: lineNumber,
          column: 1,
          message: error instanceof Error ? error.message : 'Parse error',
          severity: 'error'
        });
      }
    }

    // Validate required functions
    const setupFunction = functions.find(f => f.name === 'setup');
    const loopFunction = functions.find(f => f.name === 'loop');

    if (!setupFunction) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Missing required setup() function',
        severity: 'error',
        code: 'MISSING_SETUP'
      });
    }

    if (!loopFunction) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Missing required loop() function',
        severity: 'error',
        code: 'MISSING_LOOP'
      });
    }

    return {
      success: errors.length === 0,
      includes,
      functions,
      variables,
      errors,
      warnings
    };
  }

  /**
   * Extract #include statements
   */
  public extractIncludes(code: string): string[] {
    const includeRegex = /^\s*#include\s*[<"](.*?)[>"]/gm;
    const includes: string[] = [];
    let match;

    while ((match = includeRegex.exec(code)) !== null) {
      includes.push(match[1]);
    }

    return includes;
  }

  /**
   * Extract function definitions
   */
  public extractFunctions(code: string): ParsedFunction[] {
    const functionRegex = /(\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    const functions: ParsedFunction[] = [];
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      const returnType = match[1];
      const name = match[2];
      const paramString = match[3];
      
      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const line = beforeMatch.split('\n').length;

      functions.push({
        name,
        returnType,
        parameters: this.parseParameters(`${returnType} ${name}(${paramString})`),
        body: '',
        line,
        column: beforeMatch.split('\n').pop()?.length || 0
      });
    }

    return functions;
  }

  /**
   * Extract variable declarations
   */
  public extractVariables(code: string): ParsedVariable[] {
    const varRegex = /^\s*(const\s+)?(\w+)\s+(\w+)(?:\s*=\s*([^;]+))?\s*;/gm;
    const variables: ParsedVariable[] = [];
    let match;

    while ((match = varRegex.exec(code)) !== null) {
      const isConst = !!match[1];
      const type = match[2];
      const name = match[3];
      const value = match[4];

      // Find line number
      const beforeMatch = code.substring(0, match.index);
      const line = beforeMatch.split('\n').length;

      variables.push({
        name,
        type,
        value: value?.trim(),
        isConst,
        line,
        column: 1
      });
    }

    return variables;
  }

  /**
   * Validate Arduino-specific syntax
   */
  public validateArduinoSyntax(code: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = code.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum];
      const lineNumber = lineNum + 1;

      // Check for common Arduino mistakes
      if (line.includes('digitalWrite') && !line.includes('pinMode')) {
        // Check if pinMode is called elsewhere for the same pin
        const pinMatch = line.match(/digitalWrite\s*\(\s*(\d+|[A-Z]\d*)/);
        if (pinMatch) {
          const pin = pinMatch[1];
          const hasPinMode = code.includes(`pinMode(${pin}`) || code.includes(`pinMode( ${pin}`);
          if (!hasPinMode) {
            errors.push({
              line: lineNumber,
              column: line.indexOf('digitalWrite') + 1,
              message: `Pin ${pin} used with digitalWrite but pinMode not set`,
              suggestion: `Add pinMode(${pin}, OUTPUT); in setup()`
            });
          }
        }
      }

      // Check for invalid pin numbers
      const pinFunctionMatch = line.match(/(digitalWrite|digitalRead|pinMode)\s*\(\s*(\d+)/);
      if (pinFunctionMatch) {
        const pinNumber = parseInt(pinFunctionMatch[2]);
        if (pinNumber < 0 || pinNumber > 53) { // Arduino Mega max pins
          errors.push({
            line: lineNumber,
            column: line.indexOf(pinFunctionMatch[0]) + 1,
            message: `Invalid pin number: ${pinNumber}`,
            suggestion: 'Use pins 0-13 for Uno, or 0-53 for Mega'
          });
        }
      }

      // Check for analogWrite on non-PWM pins (Uno specific)
      const analogWriteMatch = line.match(/analogWrite\s*\(\s*(\d+)/);
      if (analogWriteMatch) {
        const pin = parseInt(analogWriteMatch[1]);
        const unoPwmPins = [3, 5, 6, 9, 10, 11];
        if (!unoPwmPins.includes(pin)) {
          errors.push({
            line: lineNumber,
            column: line.indexOf('analogWrite') + 1,
            message: `Pin ${pin} does not support PWM on Arduino Uno`,
            suggestion: `Use PWM-capable pins: ${unoPwmPins.join(', ')}`
          });
        }
      }

      // Check for Serial usage without initialization
      if (line.includes('Serial.print') && !code.includes('Serial.begin')) {
        errors.push({
          line: lineNumber,
          column: line.indexOf('Serial.print') + 1,
          message: 'Serial.print used but Serial.begin() not found',
          suggestion: 'Add Serial.begin(9600); in setup()'
        });
      }
    }

    return errors;
  }

  /**
   * Parse function parameters
   */
  private parseParameters(functionSignature: string): Parameter[] {
    const paramMatch = functionSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) {
      return [];
    }

    const paramString = paramMatch[1].trim();
    const params = paramString.split(',');
    
    return params.map(param => {
      const trimmed = param.trim();
      const parts = trimmed.split(/\s+/);
      
      if (parts.length >= 2) {
        const type = parts[0];
        const nameAndDefault = parts[1];
        const [name, defaultValue] = nameAndDefault.split('=');
        
        return {
          type,
          name: name.trim(),
          defaultValue: defaultValue?.trim()
        };
      }
      
      return { type: 'unknown', name: trimmed };
    });
  }

  /**
   * Find matching brace for function body extraction
   */
  private findMatchingBrace(code: string, startPos: number): number {
    let braceCount = 0;
    let inString = false;
    let inComment = false;
    
    for (let i = startPos; i < code.length; i++) {
      const char = code[i];
      const nextChar = code[i + 1];

      // Handle string literals
      if (char === '"' && !inComment) {
        inString = !inString;
        continue;
      }

      // Handle comments
      if (!inString) {
        if (char === '/' && nextChar === '/') {
          // Line comment
          while (i < code.length && code[i] !== '\n') i++;
          continue;
        }
        if (char === '/' && nextChar === '*') {
          // Block comment
          inComment = true;
          i++; // Skip the '*'
          continue;
        }
        if (inComment && char === '*' && nextChar === '/') {
          inComment = false;
          i++; // Skip the '/'
          continue;
        }
      }

      if (!inString && !inComment) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            return i;
          }
        }
      }
    }

    return code.length; // If no matching brace found
  }

  /**
   * Check if a function is a built-in Arduino function
   */
  public isArduinoFunction(functionName: string): boolean {
    return this.arduinoFunctions.includes(functionName);
  }

  /**
   * Get suggestions for unknown functions
   */
  public getFunctionSuggestions(functionName: string): string[] {
    const suggestions: string[] = [];
    const lowerName = functionName.toLowerCase();
    
    // Find similar function names
    for (const arduinoFunc of this.arduinoFunctions) {
      if (arduinoFunc.toLowerCase().includes(lowerName) || 
          lowerName.includes(arduinoFunc.toLowerCase())) {
        suggestions.push(arduinoFunc);
      }
    }

    // Levenshtein distance for close matches
    const closeMatches = this.arduinoFunctions.filter(func => 
      this.levenshteinDistance(functionName.toLowerCase(), func.toLowerCase()) <= 2
    );
    
    suggestions.push(...closeMatches);

    return [...new Set(suggestions)].slice(0, 3); // Remove duplicates and limit
  }

  /**
   * Calculate Levenshtein distance for string similarity
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}