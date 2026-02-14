/**
 * Arduino Auto-Completion Provider for Monaco Editor
 * Provides intelligent code completion for Arduino C++ functions and libraries
 */

import * as monaco from 'monaco-editor';
import { ARDUINO_KEYWORDS, ARDUINO_LIBRARIES } from './ArduinoLanguage';

interface ArduinoFunction {
  name: string;
  signature: string;
  description: string;
  example?: string;
  returnType?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
}

// Arduino core function definitions with detailed information
const ARDUINO_FUNCTIONS: ArduinoFunction[] = [
  // Digital I/O
  {
    name: 'pinMode',
    signature: 'pinMode(pin, mode)',
    description: 'Configures the specified pin to behave either as an input or an output',
    returnType: 'void',
    parameters: [
      { name: 'pin', type: 'uint8_t', description: 'Pin number' },
      { name: 'mode', type: 'uint8_t', description: 'INPUT, OUTPUT, or INPUT_PULLUP' }
    ],
    example: 'pinMode(13, OUTPUT);'
  },
  {
    name: 'digitalWrite',
    signature: 'digitalWrite(pin, value)',
    description: 'Write a HIGH or LOW value to a digital pin',
    returnType: 'void',
    parameters: [
      { name: 'pin', type: 'uint8_t', description: 'Pin number' },
      { name: 'value', type: 'uint8_t', description: 'HIGH or LOW' }
    ],
    example: 'digitalWrite(13, HIGH);'
  },
  {
    name: 'digitalRead',
    signature: 'digitalRead(pin)',
    description: 'Reads the value from a specified digital pin, either HIGH or LOW',
    returnType: 'int',
    parameters: [
      { name: 'pin', type: 'uint8_t', description: 'Pin number' }
    ],
    example: 'int buttonState = digitalRead(2);'
  },

  // Analog I/O
  {
    name: 'analogRead',
    signature: 'analogRead(pin)',
    description: 'Reads the voltage from the specified analog pin',
    returnType: 'int',
    parameters: [
      { name: 'pin', type: 'uint8_t', description: 'Analog pin number (A0-A5)' }
    ],
    example: 'int sensorValue = analogRead(A0);'
  },
  {
    name: 'analogWrite',
    signature: 'analogWrite(pin, value)',
    description: 'Writes an analog value (PWM wave) to a pin',
    returnType: 'void',
    parameters: [
      { name: 'pin', type: 'uint8_t', description: 'Pin number' },
      { name: 'value', type: 'int', description: 'Duty cycle: 0 (always off) to 255 (always on)' }
    ],
    example: 'analogWrite(9, 128); // 50% duty cycle'
  },

  // Time
  {
    name: 'delay',
    signature: 'delay(ms)',
    description: 'Pauses the program for the amount of time specified as parameter',
    returnType: 'void',
    parameters: [
      { name: 'ms', type: 'unsigned long', description: 'Number of milliseconds to pause' }
    ],
    example: 'delay(1000); // Wait for 1 second'
  },
  {
    name: 'delayMicroseconds',
    signature: 'delayMicroseconds(us)',
    description: 'Pauses the program for the amount of time specified in microseconds',
    returnType: 'void',
    parameters: [
      { name: 'us', type: 'unsigned int', description: 'Number of microseconds to pause' }
    ],
    example: 'delayMicroseconds(1000); // Wait for 1 millisecond'
  },
  {
    name: 'millis',
    signature: 'millis()',
    description: 'Returns the number of milliseconds since the Arduino board began running',
    returnType: 'unsigned long',
    parameters: [],
    example: 'unsigned long currentTime = millis();'
  },
  {
    name: 'micros',
    signature: 'micros()',
    description: 'Returns the number of microseconds since the Arduino board began running',
    returnType: 'unsigned long',
    parameters: [],
    example: 'unsigned long currentMicros = micros();'
  },

  // Serial Communication
  {
    name: 'Serial.begin',
    signature: 'Serial.begin(speed)',
    description: 'Sets the data rate in bits per second for serial data transmission',
    returnType: 'void',
    parameters: [
      { name: 'speed', type: 'long', description: 'Baud rate (e.g., 9600, 57600, 115200)' }
    ],
    example: 'Serial.begin(9600);'
  },
  {
    name: 'Serial.print',
    signature: 'Serial.print(val)',
    description: 'Prints data to the serial port as human-readable ASCII text',
    returnType: 'size_t',
    parameters: [
      { name: 'val', type: 'any', description: 'Value to print' }
    ],
    example: 'Serial.print("Hello World");'
  },
  {
    name: 'Serial.println',
    signature: 'Serial.println(val)',
    description: 'Prints data to the serial port followed by a carriage return and line feed',
    returnType: 'size_t',
    parameters: [
      { name: 'val', type: 'any', description: 'Value to print' }
    ],
    example: 'Serial.println("Debug info");'
  },
  {
    name: 'Serial.available',
    signature: 'Serial.available()',
    description: 'Get the number of bytes available for reading from the serial port',
    returnType: 'int',
    parameters: [],
    example: 'if (Serial.available() > 0) { ... }'
  },
  {
    name: 'Serial.read',
    signature: 'Serial.read()',
    description: 'Reads incoming serial data',
    returnType: 'int',
    parameters: [],
    example: 'int incomingByte = Serial.read();'
  },

  // Math
  {
    name: 'map',
    signature: 'map(value, fromLow, fromHigh, toLow, toHigh)',
    description: 'Re-maps a number from one range to another',
    returnType: 'long',
    parameters: [
      { name: 'value', type: 'long', description: 'Number to map' },
      { name: 'fromLow', type: 'long', description: 'Lower bound of the current range' },
      { name: 'fromHigh', type: 'long', description: 'Upper bound of the current range' },
      { name: 'toLow', type: 'long', description: 'Lower bound of the target range' },
      { name: 'toHigh', type: 'long', description: 'Upper bound of the target range' }
    ],
    example: 'int mapped = map(sensorValue, 0, 1023, 0, 255);'
  },
  {
    name: 'constrain',
    signature: 'constrain(amt, low, high)',
    description: 'Constrains a number to be within a range',
    returnType: 'long',
    parameters: [
      { name: 'amt', type: 'long', description: 'Number to constrain' },
      { name: 'low', type: 'long', description: 'Lower end of the range' },
      { name: 'high', type: 'long', description: 'Upper end of the range' }
    ],
    example: 'int constrainedValue = constrain(sensor, 0, 255);'
  },

  // Required functions
  {
    name: 'setup',
    signature: 'void setup()',
    description: 'The setup function is called when a sketch starts. Initialize variables, pin modes, start using libraries, etc.',
    returnType: 'void',
    parameters: [],
    example: 'void setup() {\n  pinMode(13, OUTPUT);\n  Serial.begin(9600);\n}'
  },
  {
    name: 'loop',
    signature: 'void loop()',
    description: 'After creating a setup function, the loop function does precisely what its name suggests, and loops consecutively',
    returnType: 'void',
    parameters: [],
    example: 'void loop() {\n  digitalWrite(13, HIGH);\n  delay(1000);\n  digitalWrite(13, LOW);\n  delay(1000);\n}'
  }
];

// Arduino constants
const ARDUINO_CONSTANTS = [
  { name: 'HIGH', value: '1', description: 'Digital pin high state (5V or 3.3V)' },
  { name: 'LOW', value: '0', description: 'Digital pin low state (0V)' },
  { name: 'INPUT', value: '0', description: 'Configure pin as input' },
  { name: 'OUTPUT', value: '1', description: 'Configure pin as output' },
  { name: 'INPUT_PULLUP', value: '2', description: 'Configure pin as input with internal pullup resistor' },
  { name: 'LED_BUILTIN', value: '13', description: 'Built-in LED pin (usually pin 13)' },
  { name: 'A0', value: '14', description: 'Analog input pin 0' },
  { name: 'A1', value: '15', description: 'Analog input pin 1' },
  { name: 'A2', value: '16', description: 'Analog input pin 2' },
  { name: 'A3', value: '17', description: 'Analog input pin 3' },
  { name: 'A4', value: '18', description: 'Analog input pin 4' },
  { name: 'A5', value: '19', description: 'Analog input pin 5' },
  { name: 'true', value: 'true', description: 'Boolean true value' },
  { name: 'false', value: 'false', description: 'Boolean false value' }
];

/**
 * Arduino Auto-Completion Provider
 */
export class ArduinoCompletionProvider implements monaco.languages.CompletionItemProvider {
  public readonly triggerCharacters = ['.', '#', ' '];

  provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
    
    const suggestions: monaco.languages.CompletionItem[] = [];
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    const textUntilPosition = model.getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column
    });

    const currentLine = model.getLineContent(position.lineNumber);
    const lineUpToPosition = currentLine.substring(0, position.column - 1);

    // Check for #include suggestions
    if (lineUpToPosition.includes('#include') || context.triggerCharacter === '#') {
      this.addLibrarySuggestions(suggestions, range);
    }
    // Check for Serial. suggestions
    else if (lineUpToPosition.includes('Serial.') || lineUpToPosition.endsWith('Serial')) {
      this.addSerialSuggestions(suggestions, range);
    }
    // Check for library-specific suggestions
    else if (this.hasLibraryIncluded(textUntilPosition, 'Wire.h') && lineUpToPosition.includes('Wire.')) {
      this.addWireSuggestions(suggestions, range);
    }
    else if (this.hasLibraryIncluded(textUntilPosition, 'SPI.h') && lineUpToPosition.includes('SPI.')) {
      this.addSPISuggestions(suggestions, range);
    }
    // General Arduino function and constant suggestions
    else {
      this.addFunctionSuggestions(suggestions, range);
      this.addConstantSuggestions(suggestions, range);
      
      // Add snippets for common patterns
      this.addSnippetSuggestions(suggestions, range);
    }

    return {
      suggestions: suggestions
    };
  }

  /**
   * Add Arduino function suggestions
   */
  private addFunctionSuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    for (const func of ARDUINO_FUNCTIONS) {
      const insertText = this.createFunctionSnippet(func);
      
      suggestions.push({
        label: func.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: {
          value: this.createFunctionDocumentation(func),
          isTrusted: true
        },
        detail: func.signature,
        range: range
      });
    }
  }

  /**
   * Add Arduino constant suggestions
   */
  private addConstantSuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    for (const constant of ARDUINO_CONSTANTS) {
      suggestions.push({
        label: constant.name,
        kind: monaco.languages.CompletionItemKind.Constant,
        insertText: constant.name,
        documentation: constant.description,
        detail: `Value: ${constant.value}`,
        range: range
      });
    }
  }

  /**
   * Add library include suggestions
   */
  private addLibrarySuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    for (const [libName, libInfo] of Object.entries(ARDUINO_LIBRARIES)) {
      suggestions.push({
        label: libName,
        kind: monaco.languages.CompletionItemKind.Module,
        insertText: `#include <${libName}>`,
        documentation: libInfo.description,
        detail: `Include ${libName}`,
        range: range
      });
    }
  }

  /**
   * Add Serial function suggestions
   */
  private addSerialSuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    const serialFunctions = ARDUINO_FUNCTIONS.filter(f => f.name.startsWith('Serial.'));
    
    for (const func of serialFunctions) {
      const insertText = func.name.replace('Serial.', '') + this.createParameterSnippet(func);
      
      suggestions.push({
        label: func.name.replace('Serial.', ''),
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: {
          value: this.createFunctionDocumentation(func),
          isTrusted: true
        },
        detail: func.signature.replace('Serial.', ''),
        range: range
      });
    }
  }

  /**
   * Add Wire library function suggestions
   */
  private addWireSuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    const wireFunctions = ARDUINO_LIBRARIES['Wire.h'].functions;
    
    for (const funcName of wireFunctions) {
      const methodName = funcName.replace('Wire.', '');
      suggestions.push({
        label: methodName,
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: methodName + '(${1});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `Wire library method: ${funcName}`,
        detail: funcName.replace('Wire.', ''),
        range: range
      });
    }
  }

  /**
   * Add SPI library function suggestions
   */
  private addSPISuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    const spiFunctions = ARDUINO_LIBRARIES['SPI.h'].functions;
    
    for (const funcName of spiFunctions) {
      const methodName = funcName.replace('SPI.', '');
      suggestions.push({
        label: methodName,
        kind: monaco.languages.CompletionItemKind.Method,
        insertText: methodName + '(${1});',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `SPI library method: ${funcName}`,
        detail: funcName.replace('SPI.', ''),
        range: range
      });
    }
  }

  /**
   * Add code snippet suggestions
   */
  private addSnippetSuggestions(suggestions: monaco.languages.CompletionItem[], range: monaco.IRange): void {
    const snippets = [
      {
        label: 'Basic Arduino Sketch',
        insertText: `void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Initialize digital pin 13 as an output
  pinMode(13, OUTPUT);
}

void loop() {
  // Turn the LED on
  digitalWrite(13, HIGH);
  delay(1000);
  
  // Turn the LED off
  digitalWrite(13, LOW);
  delay(1000);
}`,
        documentation: 'Basic Arduino sketch template with setup() and loop() functions'
      },
      {
        label: 'for loop',
        insertText: `for (int i = 0; i < 10; i++) {
  // loop body
}`,
        documentation: 'For loop template'
      },
      {
        label: 'if statement',
        insertText: `if (condition) {
  // code here
}`,
        documentation: 'If statement template'
      },
      {
        label: 'Analog Read',
        insertText: `int sensorValue = analogRead(A0);
Serial.println(sensorValue);`,
        documentation: 'Read analog sensor and print value'
      },
      {
        label: 'Button Read',
        insertText: `int buttonState = digitalRead(2);
if (buttonState == HIGH) {
  // button pressed
}`,
        documentation: 'Read digital button state'
      }
    ];

    for (const snippet of snippets) {
      suggestions.push({
        label: snippet.label,
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: snippet.insertText,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: snippet.documentation,
        range: range
      });
    }
  }

  /**
   * Create function snippet with parameters
   */
  private createFunctionSnippet(func: ArduinoFunction): string {
    if (!func.parameters || func.parameters.length === 0) {
      return `${func.name}()`;
    }

    const params = func.parameters.map((param, index) => 
      `\${${index + 1}:${param.name}}`
    ).join(', ');

    return `${func.name}(${params})`;
  }

  /**
   * Create parameter snippet for methods
   */
  private createParameterSnippet(func: ArduinoFunction): string {
    if (!func.parameters || func.parameters.length === 0) {
      return '()';
    }

    const params = func.parameters.map((param, index) => 
      `\${${index + 1}:${param.name}}`
    ).join(', ');

    return `(${params})`;
  }

  /**
   * Create function documentation
   */
  private createFunctionDocumentation(func: ArduinoFunction): string {
    let doc = `**${func.name}**\n\n${func.description}\n\n`;
    
    if (func.parameters && func.parameters.length > 0) {
      doc += '**Parameters:**\n';
      for (const param of func.parameters) {
        doc += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
      }
      doc += '\n';
    }
    
    if (func.returnType && func.returnType !== 'void') {
      doc += `**Returns:** ${func.returnType}\n\n`;
    }
    
    if (func.example) {
      doc += `**Example:**\n\`\`\`cpp\n${func.example}\n\`\`\``;
    }
    
    return doc;
  }

  /**
   * Check if a library is included in the code
   */
  private hasLibraryIncluded(code: string, library: string): boolean {
    return code.includes(`#include <${library}>`) || code.includes(`#include "${library}"`);
  }
}