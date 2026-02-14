/**
 * Enhanced Monaco Editor for Arduino C++
 * Complete integration with Monaco Editor, Arduino language support, and real-time compilation
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as monaco from 'monaco-editor';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import { ArduinoLanguageConfig } from './ArduinoLanguage';
import { ArduinoCompletionProvider } from './ArduinoCompletionProvider';
import { ArduinoCompiler, CompilationResult } from '../../../simulation/compiler/ArduinoCompiler';

export interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  onCompile?: (result: CompilationResult) => void;
  theme?: 'vs-dark' | 'vs-light' | 'arduino-dark' | 'arduino-light';
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  wordWrap?: boolean;
  fontSize?: number;
  tabSize?: number;
  autoCompile?: boolean;
  showErrors?: boolean;
}

export interface EditorActions {
  format: () => void;
  findAndReplace: () => void;
  gotoLine: () => void;
  compile: () => Promise<CompilationResult>;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  commentToggle: () => void;
}

/**
 * Enhanced Monaco Arduino Editor Component
 */
const MonacoArduinoEditor = React.forwardRef<EditorActions, MonacoEditorProps>(
  (props, ref) => {
    const {
      value,
      onChange,
      onCompile,
      theme = 'arduino-dark',
      readOnly = false,
      minimap = true,
      lineNumbers = true,
      wordWrap = true,
      fontSize = 14,
      tabSize = 2,
      autoCompile = false,
      showErrors = true
    } = props;

    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<typeof monaco | null>(null);
    const compilerRef = useRef<ArduinoCompiler | null>(null);
    const compilationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [compilationMarkers, setCompilationMarkers] = useState<monaco.editor.IMarkerData[]>([]);

    // Initialize compiler
    useEffect(() => {
      if (!compilerRef.current) {
        compilerRef.current = new ArduinoCompiler();
      }
    }, []);

    // Handle Monaco Editor mount
    const handleEditorDidMount: OnMount = useCallback((editor, monacoInstance) => {
      editorRef.current = editor;
      monacoRef.current = monacoInstance;

      // Register Arduino language and theme
      ArduinoLanguageConfig.registerLanguage();
      
      // Register themes
      monacoInstance.editor.defineTheme('arduino-dark', ArduinoLanguageConfig.getArduinoTheme());
      monacoInstance.editor.defineTheme('arduino-light', ArduinoLanguageConfig.getArduinoLightTheme());

      // Register completion provider
      const completionProvider = new ArduinoCompletionProvider();
      monacoInstance.languages.registerCompletionItemProvider('arduino-cpp', completionProvider);

      // Register hover provider for function documentation
      monacoInstance.languages.registerHoverProvider('arduino-cpp', {
        provideHover: (model, position) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          // Provide hover information for Arduino functions
          const functionInfo = getArduinoFunctionInfo(word.word);
          if (functionInfo) {
            return {
              range: new monacoInstance.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
              contents: [
                { value: `**${functionInfo.signature}**` },
                { value: functionInfo.description }
              ]
            };
          }

          return null;
        }
      });

      // Register signature help provider
      monacoInstance.languages.registerSignatureHelpProvider('arduino-cpp', {
        signatureHelpTriggerCharacters: ['(', ','],
        provideSignatureHelp: (model, position) => {
          // Get the current function call context
          const lineContent = model.getLineContent(position.lineNumber);
          const beforePosition = lineContent.substring(0, position.column - 1);
          
          // Find the function name before the opening parenthesis
          const match = beforePosition.match(/(\w+)\s*\([^)]*$/);
          if (match) {
            const functionName = match[1];
            const functionInfo = getArduinoFunctionInfo(functionName);
            
            if (functionInfo && functionInfo.parameters) {
              return {
                value: {
                  signatures: [{
                    label: functionInfo.signature,
                    documentation: functionInfo.description,
                    parameters: functionInfo.parameters.map(param => ({
                      label: `${param.type} ${param.name}`,
                      documentation: param.description
                    }))
                  }],
                  activeSignature: 0,
                  activeParameter: 0
                },
                dispose: () => {}
              };
            }
          }

          return null;
        }
      });

      // Set up real-time error checking
      if (showErrors) {
        setupRealTimeValidation(editor, monacoInstance);
      }

      // Configure editor options
      editor.updateOptions({
        fontSize: fontSize,
        tabSize: tabSize,
        insertSpaces: true,
        detectIndentation: false,
        minimap: { enabled: minimap },
        lineNumbers: lineNumbers ? 'on' : 'off',
        wordWrap: wordWrap ? 'on' : 'off',
        readOnly: readOnly,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        suggestOnTriggerCharacters: true,
        acceptSuggestionOnEnter: 'on',
        quickSuggestions: true,
        parameterHints: { enabled: true },
        folding: true,
        foldingStrategy: 'indentation',
        matchBrackets: 'always',
        renderWhitespace: 'boundary',
        renderLineHighlight: 'line',
        cursorBlinking: 'blink',
        cursorStyle: 'line',
        contextmenu: true
      });

      // Add keyboard shortcuts
      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyK | monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument')?.run();
      });

      editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.F9, () => {
        handleCompileShortcut();
      });

      setIsInitialized(true);
    }, [fontSize, tabSize, minimap, lineNumbers, wordWrap, readOnly, showErrors]);

    // Handle content changes
    const handleEditorChange: OnChange = useCallback((newValue) => {
      if (newValue !== undefined) {
        onChange(newValue);
        
        // Trigger auto-compilation if enabled
        if (autoCompile && compilerRef.current && editorRef.current) {
          if (compilationTimeoutRef.current) {
            clearTimeout(compilationTimeoutRef.current);
          }
          
          compilationTimeoutRef.current = setTimeout(() => {
            handleAutoCompile(newValue);
          }, 2000); // Compile after 2 seconds of inactivity
        }
      }
    }, [onChange, autoCompile]);

    // Set up real-time validation
    const setupRealTimeValidation = useCallback((editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
      const model = editor.getModel();
      if (!model) return undefined;

      // Validate on content change
      const validateCode = () => {
        const code = model.getValue();
        const validationMarkers = ArduinoLanguageConfig.validateCode(code, model);
        
        // Combine with compilation markers
        const allMarkers = [...validationMarkers, ...compilationMarkers];
        monacoInstance.editor.setModelMarkers(model, 'arduino-validation', allMarkers);
      };

      // Initial validation
      validateCode();

      // Validate on model content change
      const disposable = model.onDidChangeContent(() => {
        validateCode();
      });

      // Clean up on unmount
      return () => {
        disposable.dispose();
      };
    }, [compilationMarkers]);

    // Handle auto-compilation
    const handleAutoCompile = useCallback(async (code: string) => {
      if (!if (!compilerRef.current || !editorRef.current || !monacoRef.current) return;) return undefined;

      try {
        const result = await compilerRef.current.compile(code);
        
        // Update compilation markers
        const markers: monaco.editor.IMarkerData[] = result.errors.map(error => ({
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 10, // Rough estimation
          message: error.message,
          severity: error.severity === 'error' 
            ? monacoRef.current!.MarkerSeverity.Error 
            : monacoRef.current!.MarkerSeverity.Warning
        }));

        setCompilationMarkers(markers);
        
        // Update model markers
        const model = editorRef.current.getModel();
        if (model) {
          const validationMarkers = ArduinoLanguageConfig.validateCode(code, model);
          const allMarkers = [...validationMarkers, ...markers];
          monacoRef.current.editor.setModelMarkers(model, 'arduino-compilation', allMarkers);
        }

        onCompile?.(result);
      } catch (error) {
        console.error('Auto-compilation failed:', error);
      }
    }, [onCompile]);

    // Handle manual compilation (F9 shortcut)
    const handleCompileShortcut = useCallback(async () => {
      if (!if (!compilerRef.current || !editorRef.current) return;) return undefined;

      const code = editorRef.current.getValue();
      const result = await compilerRef.current.compile(code);
      onCompile?.(result);
    }, [onCompile]);

    // Expose editor actions via ref
    React.useImperativeHandle(ref, () => ({
      format: () => {
        editorRef.current?.getAction('editor.action.formatDocument')?.run();
      },
      findAndReplace: () => {
        editorRef.current?.getAction('editor.action.startFindReplaceAction')?.run();
      },
      gotoLine: () => {
        editorRef.current?.getAction('editor.action.gotoLine')?.run();
      },
      compile: async () => {
        if (!compilerRef.current || !editorRef.current) {
          throw new Error('Editor or compiler not initialized');
        }
        const code = editorRef.current.getValue();
        return await compilerRef.current.compile(code);
      },
      undo: () => {
        editorRef.current?.getAction('undo')?.run();
      },
      redo: () => {
        editorRef.current?.getAction('redo')?.run();
      },
      selectAll: () => {
        editorRef.current?.getAction('editor.action.selectAll')?.run();
      },
      commentToggle: () => {
        editorRef.current?.getAction('editor.action.commentLine')?.run();
      }
    }), []);

    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (compilationTimeoutRef.current) {
          clearTimeout(compilationTimeoutRef.current);
        }
      };
    }, []);

    return (
      <Editor
        height="100%"
        language="arduino-cpp"
        theme={theme}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false
        }}
        loading={<div>Loading Arduino IDE...</div>}
      />
    );
  }
);

MonacoArduinoEditor.displayName = 'MonacoArduinoEditor';

// Helper function to get Arduino function information
function getArduinoFunctionInfo(functionName: string) {
  const functions = [
    {
      name: 'pinMode',
      signature: 'pinMode(pin, mode)',
      description: 'Configures the specified pin to behave either as an input or an output.',
      parameters: [
        { name: 'pin', type: 'uint8_t', description: 'Pin number' },
        { name: 'mode', type: 'uint8_t', description: 'INPUT, OUTPUT, or INPUT_PULLUP' }
      ]
    },
    {
      name: 'digitalWrite',
      signature: 'digitalWrite(pin, value)',
      description: 'Write a HIGH or LOW value to a digital pin.',
      parameters: [
        { name: 'pin', type: 'uint8_t', description: 'Pin number' },
        { name: 'value', type: 'uint8_t', description: 'HIGH or LOW' }
      ]
    },
    {
      name: 'digitalRead',
      signature: 'digitalRead(pin)',
      description: 'Reads the value from a specified digital pin, either HIGH or LOW.',
      parameters: [
        { name: 'pin', type: 'uint8_t', description: 'Pin number' }
      ]
    },
    {
      name: 'delay',
      signature: 'delay(ms)',
      description: 'Pauses the program for the amount of time specified as parameter.',
      parameters: [
        { name: 'ms', type: 'unsigned long', description: 'Number of milliseconds to pause' }
      ]
    }
    // Add more functions as needed
  ];

  return functions.find(func => func.name === functionName);
}

export default MonacoArduinoEditor;