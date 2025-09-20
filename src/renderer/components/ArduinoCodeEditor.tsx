import React, { useEffect, useState } from 'react';
import { Box, Paper, IconButton, Tooltip, ButtonGroup, Typography, Alert } from '@mui/material';
import {
  Stop as StopIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Folder as LoadIcon,
  BugReport as DebugIcon
} from '@mui/icons-material';

// Monaco Editor types (will need to install @monaco-editor/react)
interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  theme: string;
  options: any;
}

// Simplified Monaco Editor component placeholder
const MonacoEditor: React.FC<MonacoEditorProps> = ({ value, onChange, options }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: 'Monaco, Consolas, "Courier New", monospace',
        fontSize: '14px',
        border: 'none',
        outline: 'none',
        resize: 'none',
        padding: '16px',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        ...options?.style
      }}
      placeholder="// Arduino IDE - Enter your code here
void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Set pin 13 as output (built-in LED)
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);   // Turn LED on
  delay(1000);              // Wait 1 second
  digitalWrite(13, LOW);    // Turn LED off
  delay(1000);              // Wait 1 second
}"
    />
  );
};

interface CompilationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  binarySize: number;
}

interface ArduinoCodeEditorProps {
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onUpload?: (code: string) => Promise<boolean>;
  onSave?: (code: string, filename: string) => Promise<boolean>;
  onLoad?: () => Promise<string>;
  boardType?: string;
  serialPort?: string;
}

const ArduinoCodeEditor: React.FC<ArduinoCodeEditorProps> = ({
  initialCode = '',
  onCodeChange,
  onUpload,
  onSave,
  onLoad,
  boardType = 'Arduino Uno',
  serialPort = 'Virtual'
}) => {
  const [code, setCode] = useState(initialCode);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null);
  const [serialOutput, setSerialOutput] = useState<string[]>([]);
  const [currentFilename, setCurrentFilename] = useState('sketch.ino');

  // Auto-save functionality
  useEffect(() => {
    const timer = setTimeout(() => {
      onCodeChange?.(code);
    }, 1000); // Auto-save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [code, onCodeChange]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setCompilationResult(null); // Clear previous compilation results
  };

  const compileCode = async (): Promise<CompilationResult> => {
    setIsCompiling(true);
    
    try {
      // Simulate compilation process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Basic syntax checking (simplified)
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check for common Arduino syntax errors
      if (!code.includes('setup()')) {
        errors.push('Missing setup() function');
      }
      
      if (!code.includes('loop()')) {
        errors.push('Missing loop() function');
      }
      
      // Check for unmatched braces
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push('Unmatched braces detected');
      }
      
      // Check for common mistakes
      if (code.includes('delay(') && !code.includes('#include')) {
        warnings.push('Using delay() without including necessary libraries');
      }
      
      if (code.includes('Serial.') && !code.includes('Serial.begin')) {
        warnings.push('Using Serial without initialization in setup()');
      }

      const result: CompilationResult = {
        success: errors.length === 0,
        errors,
        warnings,
        binarySize: Math.floor(Math.random() * 10000) + 2000 // Simulated binary size
      };
      
      setCompilationResult(result);
      return result;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleUpload = async () => {
    if (isCompiling || isUploading) return;
    
    // Compile first
    const result = await compileCode();
    
    if (result.success) {
      setIsUploading(true);
      try {
        const success = await onUpload?.(code) ?? true;
        if (success) {
          setSerialOutput(prev => [...prev, `✓ Upload completed to ${boardType} on ${serialPort}`]);
          setSerialOutput(prev => [...prev, `Binary size: ${result.binarySize} bytes`]);
        } else {
          setSerialOutput(prev => [...prev, `✗ Upload failed`]);
        }
      } finally {
        setIsUploading(false);
      }
    } else {
      setSerialOutput(prev => [...prev, `✗ Compilation failed - fix errors before uploading`]);
    }
  };

  const handleSave = async () => {
    const filename = prompt('Save as:', currentFilename);
    if (filename) {
      const success = await onSave?.(code, filename) ?? true;
      if (success) {
        setCurrentFilename(filename);
        setSerialOutput(prev => [...prev, `✓ Saved as ${filename}`]);
      }
    }
  };

  const handleLoad = async () => {
    try {
      const loadedCode = await onLoad?.() ?? '';
      if (loadedCode) {
        setCode(loadedCode);
        setSerialOutput(prev => [...prev, `✓ Sketch loaded`]);
      }
    } catch {
      setSerialOutput(prev => [...prev, `✗ Failed to load sketch`]);
    }
  };

  const clearSerialOutput = () => {
    setSerialOutput([]);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Paper elevation={1} sx={{ p: 1, borderRadius: 0, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ButtonGroup size="small" variant="contained">
              <Tooltip title="Verify/Compile">
                <IconButton 
                  onClick={compileCode} 
                  disabled={isCompiling}
                  color={compilationResult?.success ? 'success' : compilationResult?.errors.length ? 'error' : 'primary'}
                >
                  <DebugIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Upload">
                <IconButton 
                  onClick={handleUpload} 
                  disabled={isCompiling || isUploading}
                  color="primary"
                >
                  {isUploading ? <StopIcon /> : <UploadIcon />}
                </IconButton>
              </Tooltip>
            </ButtonGroup>
            
            <ButtonGroup size="small" variant="outlined">
              <Tooltip title="Save">
                <IconButton onClick={handleSave}>
                  <SaveIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Open">
                <IconButton onClick={handleLoad}>
                  <LoadIcon />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {currentFilename}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Board: {boardType}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Port: {serialPort}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Code Editor */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          <MonacoEditor
            value={code}
            onChange={handleCodeChange}
            language="cpp"
            theme="vs-dark"
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              fontFamily: 'Monaco, Consolas, "Courier New", monospace',
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'boundary',
              folding: true,
              lineNumbers: 'on',
              bracketMatching: 'always',
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabSize: 2,
              insertSpaces: true
            }}
          />
        </Box>

        {/* Status Bar */}
        <Paper elevation={1} sx={{ p: 1, borderRadius: 0, borderTop: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {isCompiling && (
                <Typography variant="body2" color="warning.main">
                  Compiling...
                </Typography>
              )}
              {isUploading && (
                <Typography variant="body2" color="primary.main">
                  Uploading...
                </Typography>
              )}
              {compilationResult && (
                <Typography 
                  variant="body2" 
                  color={compilationResult.success ? 'success.main' : 'error.main'}
                >
                  {compilationResult.success 
                    ? `✓ Compiled successfully (${compilationResult.binarySize} bytes)`
                    : `✗ ${compilationResult.errors.length} error(s), ${compilationResult.warnings.length} warning(s)`
                  }
                </Typography>
              )}
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Lines: {code.split('\n').length} | Chars: {code.length}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Error/Warning Panel */}
      {compilationResult && (compilationResult.errors.length > 0 || compilationResult.warnings.length > 0) && (
        <Paper elevation={1} sx={{ maxHeight: '200px', overflow: 'auto' }}>
          <Box sx={{ p: 1 }}>
            {compilationResult.errors.map((error, index) => (
              <Alert key={`error-${index}`} severity="error" variant="outlined" sx={{ mb: 0.5 }}>
                {error}
              </Alert>
            ))}
            {compilationResult.warnings.map((warning, index) => (
              <Alert key={`warning-${index}`} severity="warning" variant="outlined" sx={{ mb: 0.5 }}>
                {warning}
              </Alert>
            ))}
          </Box>
        </Paper>
      )}

      {/* Serial Monitor */}
      {serialOutput.length > 0 && (
        <Paper elevation={1} sx={{ maxHeight: '150px', overflow: 'auto' }}>
          <Box sx={{ p: 1, backgroundColor: '#000', color: '#0f0', fontFamily: 'monospace', fontSize: '12px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#0f0' }}>Serial Monitor</Typography>
              <IconButton size="small" onClick={clearSerialOutput} sx={{ color: '#0f0' }}>
                ✕
              </IconButton>
            </Box>
            {serialOutput.map((output, index) => (
              <div key={index}>{output}</div>
            ))}
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ArduinoCodeEditor;