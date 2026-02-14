/**
 * Arduino Language Configuration for Monaco Editor
 * Provides syntax highlighting and language features for Arduino C++
 */

import * as monaco from 'monaco-editor';

// Arduino-specific keywords and constants
export const ARDUINO_KEYWORDS = [
  // Core functions
  'setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead',
  'analogRead', 'analogWrite', 'delay', 'delayMicroseconds',
  'millis', 'micros', 'attachInterrupt', 'detachInterrupt',
  'interrupts', 'noInterrupts', 'pulseIn', 'pulseInLong',
  'shiftIn', 'shiftOut', 'tone', 'noTone',
  
  // Constants
  'HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP',
  'LED_BUILTIN', 'true', 'false', 'CHANGE', 'FALLING', 'RISING',
  
  // Data types
  'void', 'int', 'bool', 'char', 'byte', 'word', 'long',
  'float', 'double', 'String', 'boolean', 'unsigned',
  
  // Serial functions
  'Serial', 'begin', 'end', 'available', 'read', 'peek',
  'flush', 'print', 'println', 'write', 'find', 'findUntil',
  'parseInt', 'parseFloat', 'readBytes', 'readBytesUntil',
  'readString', 'readStringUntil', 'setTimeout',
  
  // Math functions
  'abs', 'constrain', 'map', 'max', 'min', 'pow', 'sqrt',
  'sin', 'cos', 'tan', 'random', 'randomSeed',
  
  // Bit functions
  'bit', 'bitClear', 'bitRead', 'bitSet', 'bitWrite',
  'highByte', 'lowByte'
];

// Arduino libraries and their functions
export const ARDUINO_LIBRARIES = {
  'Wire.h': {
    functions: ['Wire.begin', 'Wire.requestFrom', 'Wire.beginTransmission', 
               'Wire.endTransmission', 'Wire.write', 'Wire.read', 'Wire.available',
               'Wire.onReceive', 'Wire.onRequest', 'Wire.setClock'],
    description: 'Two Wire Interface (I2C) library'
  },
  'SPI.h': {
    functions: ['SPI.begin', 'SPI.end', 'SPI.transfer', 'SPI.beginTransaction',
               'SPI.endTransaction', 'SPI.setBitOrder', 'SPI.setDataMode', 
               'SPI.setClockDivider'],
    description: 'Serial Peripheral Interface library'
  },
  'Servo.h': {
    functions: ['servo.attach', 'servo.detach', 'servo.write', 'servo.writeMicroseconds',
               'servo.read', 'servo.attached'],
    description: 'Servo motor control library'
  },
  'LiquidCrystal.h': {
    functions: ['lcd.begin', 'lcd.clear', 'lcd.home', 'lcd.setCursor',
               'lcd.write', 'lcd.print', 'lcd.cursor', 'lcd.noCursor',
               'lcd.blink', 'lcd.noBlink', 'lcd.display', 'lcd.noDisplay',
               'lcd.scrollDisplayLeft', 'lcd.scrollDisplayRight',
               'lcd.autoscroll', 'lcd.noAutoscroll', 'lcd.leftToRight',
               'lcd.rightToLeft', 'lcd.createChar'],
    description: 'Liquid Crystal Display library'
  },
  'SoftwareSerial.h': {
    functions: ['SoftwareSerial', 'begin', 'end', 'available', 'read', 
               'write', 'print', 'println', 'flush', 'peek'],
    description: 'Software serial communication library'
  },
  'EEPROM.h': {
    functions: ['EEPROM.read', 'EEPROM.write', 'EEPROM.update', 'EEPROM.get',
               'EEPROM.put', 'EEPROM.length'],
    description: 'EEPROM memory access library'
  }
};

// Common error patterns for real-time validation
export const COMMON_ERROR_PATTERNS = [
  {
    pattern: /digitalWrite\(\s*(\d+)\s*,\s*(true|false)\s*\)/g,
    message: 'Use HIGH/LOW instead of true/false for digitalWrite',
    severity: monaco.MarkerSeverity.Warning as const
  },
  {
    pattern: /analogWrite\(\s*([02-478-9]|1[2-9]|[2-9]\d)\s*,/g,
    message: 'Pin {1} does not support PWM output (analogWrite)',
    severity: monaco.MarkerSeverity.Error as const
  },
  {
    pattern: /pinMode\(\s*\)/g,
    message: 'pinMode() requires two parameters: pin and mode',
    severity: monaco.MarkerSeverity.Error as const
  },
  {
    pattern: /delay\(\s*\)/g,
    message: 'delay() requires a time parameter in milliseconds',
    severity: monaco.MarkerSeverity.Error as const
  },
  {
    pattern: /Serial\.print\w*\(\s*\)/g,
    message: 'Serial.print() requires a parameter to output',
    severity: monaco.MarkerSeverity.Error as const
  },
  {
    pattern: /(\w+)\s*=\s*digitalRead\(\s*(\d+)\s*\)/g,
    message: 'Consider using if (digitalRead($2) == HIGH) instead of assignment',
    severity: monaco.MarkerSeverity.Info as const
  }
];

/**
 * Arduino Language Configuration Class
 */
export class ArduinoLanguageConfig {
  private static isRegistered = false;

  /**
   * Register Arduino language with Monaco Editor
   */
  public static registerLanguage(): void {
    if (this.isRegistered) {
      return;
    }

    // Register the language
    monaco.languages.register({ id: 'arduino-cpp' });

    // Set the tokens provider
    monaco.languages.setMonarchTokensProvider('arduino-cpp', {
      defaultToken: '',
      tokenPostfix: '.arduino-cpp',

      keywords: [
        // C++ keywords
        'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do',
        'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if',
        'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static',
        'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile',
        'while', 'class', 'private', 'protected', 'public', 'template',
        'this', 'virtual', 'inline', 'explicit', 'namespace', 'using',
        
        // Arduino-specific keywords
        ...ARDUINO_KEYWORDS
      ],

      typeKeywords: [
        'boolean', 'void', 'bool', 'byte', 'word', 'String',
        'int', 'long', 'float', 'double', 'char', 'unsigned'
      ],

      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],

      // Common Arduino symbols
      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      // C++ style escapes
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

      tokenizer: {
        root: [
          // Arduino functions - highlighted specially
          [/\b(setup|loop)\b(?=\s*\()/, 'keyword.arduino-function'],
          [/\b(pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|millis)\b(?=\s*\()/, 'keyword.arduino-function'],
          [/\b(Serial\.(begin|print|println|read|write|available))\b/, 'keyword.arduino-serial'],
          
          // Identifiers and keywords
          [/[a-z_$][\w$]*/, { 
            cases: { 
              '@typeKeywords': 'keyword.type',
              '@keywords': 'keyword',
              '@default': 'identifier' 
            } 
          }],
          [/[A-Z][\w\$]*/, 'type.identifier'],  // Show types in upper case

          // Whitespace
          { include: '@whitespace' },

          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, { 
            cases: { 
              '@operators': 'operator',
              '@default': '' 
            } 
          }],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],

          // Delimiter: after number because of .\d floats
          [/[;,.]/, 'delimiter'],

          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],  // Non-terminated string
          [/"/, { token: 'string.quote', bracket: '@open', next: '@string' }],

          // Characters
          [/'[^\\']'/, 'string'],
          [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
          [/'/, 'string.invalid']
        ],

        comment: [
          [/[^\/*]+/, 'comment'],
          [/\/\*/, 'comment', '@push'],    // Nested comment
          ["\\*/", 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],

        string: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
        ],

        whitespace: [
          [/[ \t\r\n]+/, 'white'],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
          [/#.*$/, 'keyword.preprocessor']
        ],
      },
    });

    // Set configuration
    monaco.languages.setLanguageConfiguration('arduino-cpp', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      folding: {
        markers: {
          start: new RegExp('^\\s*#pragma\\s+region\\b'),
          end: new RegExp('^\\s*#pragma\\s+endregion\\b')
        }
      },
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
      indentationRules: {
        increaseIndentPattern: new RegExp('^((?!\\/\\/).)*(\\{[^}\"\'`]*|\\([^)\"\'`]*|\\[[^\\]\"\'`]*)$'),
        decreaseIndentPattern: new RegExp('^((?!.*?\\/\\*).*\\*/)?\\s*[\\)\\}\\]].*$')
      }
    });

    this.isRegistered = true;
  }

  /**
   * Get Arduino theme definition
   */
  public static getArduinoTheme(): monaco.editor.IStandaloneThemeData {
    return {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword.arduino-function', foreground: '#FF6B35', fontStyle: 'bold' }, // Arduino orange
        { token: 'keyword.arduino-serial', foreground: '#4ECDC4', fontStyle: 'bold' },   // Teal for Serial
        { token: 'keyword', foreground: '#569CD6' },              // Blue keywords
        { token: 'keyword.type', foreground: '#4EC9B0' },         // Cyan types
        { token: 'string', foreground: '#CE9178' },               // Orange strings
        { token: 'string.escape', foreground: '#D7BA7D' },        // Yellow escapes
        { token: 'comment', foreground: '#6A9955', fontStyle: 'italic' }, // Green comments
        { token: 'number', foreground: '#B5CEA8' },               // Light green numbers
        { token: 'number.hex', foreground: '#B5CEA8' },           // Light green hex
        { token: 'number.float', foreground: '#B5CEA8' },         // Light green floats
        { token: 'operator', foreground: '#D4D4D4' },             // White operators
        { token: 'delimiter', foreground: '#D4D4D4' },            // White delimiters
        { token: 'keyword.preprocessor', foreground: '#9B9B9B' }, // Gray preprocessor
        { token: 'type.identifier', foreground: '#4EC9B0' },      // Cyan type identifiers
        { token: 'identifier', foreground: '#9CDCFE' }            // Light blue identifiers
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editor.selectionBackground': '#264F78',
        'editor.selectionHighlightBackground': '#ADD6FF26',
        'editor.findMatchBackground': '#515C6A',
        'editor.findMatchHighlightBackground': '#EA5C0055',
        'editor.hoverHighlightBackground': '#264F7840',
        'editorHoverWidget.background': '#252526',
        'editorHoverWidget.border': '#454545',
        'editorSuggestWidget.background': '#252526',
        'editorSuggestWidget.border': '#454545',
        'editorSuggestWidget.selectedBackground': '#094771'
      }
    };
  }

  /**
   * Get Arduino light theme definition
   */
  public static getArduinoLightTheme(): monaco.editor.IStandaloneThemeData {
    return {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword.arduino-function', foreground: '#D73502', fontStyle: 'bold' }, // Arduino orange (darker)
        { token: 'keyword.arduino-serial', foreground: '#008B8B', fontStyle: 'bold' },   // Dark teal for Serial
        { token: 'keyword', foreground: '#0000FF' },              // Blue keywords
        { token: 'keyword.type', foreground: '#008080' },         // Teal types
        { token: 'string', foreground: '#A31515' },               // Red strings
        { token: 'string.escape', foreground: '#FF8C00' },        // Orange escapes
        { token: 'comment', foreground: '#008000', fontStyle: 'italic' }, // Green comments
        { token: 'number', foreground: '#098658' },               // Dark green numbers
        { token: 'operator', foreground: '#000000' },             // Black operators
        { token: 'delimiter', foreground: '#000000' },            // Black delimiters
        { token: 'keyword.preprocessor', foreground: '#800080' }, // Purple preprocessor
        { token: 'type.identifier', foreground: '#008080' },      // Teal type identifiers
        { token: 'identifier', foreground: '#001080' }            // Dark blue identifiers
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#000000',
        'editorLineNumber.foreground': '#237893',
        'editor.selectionBackground': '#ADD6FF',
        'editor.selectionHighlightBackground': '#ADD6FF40'
      }
    };
  }

  /**
   * Apply common error pattern validation to code
   */
  public static validateCode(code: string, model: monaco.editor.ITextModel): monaco.editor.IMarkerData[] {
    const markers: monaco.editor.IMarkerData[] = [];
    
    for (const pattern of COMMON_ERROR_PATTERNS) {
      let match;
      const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags);
      
      while ((match = regex.exec(code)) !== null) {
        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);
        
        let message = pattern.message;
        // Replace placeholders in message
        if (match[1]) {
          message = message.replace('{1}', match[1]);
        }
        
        markers.push({
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
          message: message,
          severity: pattern.severity
        });
      }
    }
    
    return markers;
  }
}