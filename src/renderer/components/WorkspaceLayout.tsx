import React, { useState } from 'react';
import { Box, Tabs, Tab, Paper, Typography } from '@mui/material';
import ComponentPalette from './ComponentPalette';
import ComponentLibrary from './ComponentLibrary';
import PropertiesPanel from './PropertiesPanel';
import SimulationControls from './SimulationControls';
import ArduinoCodeEditor from './ArduinoCodeEditor';
import StatusBar from './StatusBar';
import ApplicationToolbar from './ApplicationToolbar';
import EnhancedCircuitCanvas from './EnhancedCircuitCanvas';

interface WorkspaceLayoutProps {
  showWelcome?: boolean;
}

const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ showWelcome = false }) => {
  const [leftPanelTab, setLeftPanelTab] = useState(0);
  const [rightPanelTab, setRightPanelTab] = useState(0);
  const [bottomPanelTab, setBottomPanelTab] = useState(0);
  
  // Mock event handlers for toolbar
  const handleNewProject = () => console.log('New project');
  const handleOpenProject = () => console.log('Open project');
  const handleSave = () => console.log('Save project');
  const handleSimulationStart = () => console.log('Start simulation');
  const handleSimulationPause = () => console.log('Pause simulation');
  const handleSimulationStop = () => console.log('Stop simulation');
  const handleSimulationReset = () => console.log('Reset simulation');

  if (showWelcome) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Paper 
          elevation={8}
          sx={{ 
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 3,
            padding: 6,
            maxWidth: 600,
            backdropFilter: 'blur(10px)'
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2f3349' }}>
            🔌 Welcome to ElectroSim
          </Typography>
          <Typography variant="h6" paragraph color="text.secondary">
            Your Arduino Circuit Simulator & Designer
          </Typography>
          <Typography variant="body1" paragraph sx={{ mb: 4 }}>
            Design circuits visually, write Arduino code, and simulate in real-time.
            Perfect for learning, prototyping, and testing without physical hardware.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create a new project or open an existing one to get started.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      {/* Application Toolbar */}
      <ApplicationToolbar
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        onSave={handleSave}
        onSimulationStart={handleSimulationStart}
        onSimulationPause={handleSimulationPause}
        onSimulationStop={handleSimulationStop}
        onSimulationReset={handleSimulationReset}
        simulationState="stopped"
        hasUnsavedChanges={false}
      />

      {/* Main Content Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Section - Canvas and Side Panels */}
        <Box sx={{ flex: 2, display: 'flex', overflow: 'hidden' }}>
          {/* Left Sidebar - Component Library and Palette */}
          <Box sx={{ 
            width: 320, 
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Tabs 
              value={leftPanelTab} 
              onChange={(_, newValue) => setLeftPanelTab(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: '1px solid #e2e8f0', minHeight: 36 }}
            >
              <Tab label="Library" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
              <Tab label="Palette" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
            </Tabs>
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {leftPanelTab === 0 ? <ComponentLibrary /> : <ComponentPalette />}
            </Box>
          </Box>

          {/* Canvas Area - Center */}
          <Box sx={{ 
            flex: 1,
            m: 2,
            border: '1px solid #e2e8f0',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <EnhancedCircuitCanvas />
          </Box>

          {/* Right Sidebar - Properties and Simulation Controls */}
          <Box sx={{ 
            width: 320,
            borderLeft: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Tabs 
              value={rightPanelTab} 
              onChange={(_, newValue) => setRightPanelTab(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: '1px solid #e2e8f0', minHeight: 36 }}
            >
              <Tab label="Properties" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
              <Tab label="Simulation" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
            </Tabs>
            
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              {rightPanelTab === 0 ? <PropertiesPanel /> : <SimulationControls />}
            </Box>
          </Box>
        </Box>

        {/* Bottom Section - Code Editor */}
        <Box sx={{ 
          height: 350,
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Tabs 
            value={bottomPanelTab} 
            onChange={(_, newValue) => setBottomPanelTab(newValue)}
            sx={{ borderBottom: '1px solid #e2e8f0', minHeight: 36 }}
          >
            <Tab label="Arduino Code" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
            <Tab label="Serial Monitor" sx={{ minHeight: 36, fontSize: '0.875rem' }} />
          </Tabs>
          
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            {bottomPanelTab === 0 ? (
              <ArduinoCodeEditor />
            ) : (
              <Box sx={{ p: 2, backgroundColor: '#1e1e1e', color: '#d4d4d4', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                <Typography variant="body2" sx={{ color: '#d4d4d4' }}>
                  Serial Monitor - Ready
                </Typography>
                <Typography variant="body2" sx={{ color: '#569cd6', mt: 1 }}>
                  Waiting for data...
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Status Bar */}
      <StatusBar />
    </Box>
  );
};

export default WorkspaceLayout;