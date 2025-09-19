import React, { useEffect } from 'react';
import { Box, Typography, Container, Button } from '@mui/material';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize the application
    console.log('ElectroLoom Arduino Simulator initializing...');
    
    // Check if we're running in Electron
    if (window.electronAPI) {
      console.log('Running in Electron environment');
    } else {
      console.log('Running in browser environment (development)');
    }
  }, []);

  const handleNewProject = () => {
    console.log('Creating new project...');
  };

  const handleOpenProject = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.project.open();
        if (result) {
          console.log('Opened project:', result.project.name);
        }
      } catch (error) {
        console.error('Failed to open project:', error);
      }
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <Box sx={{ 
        padding: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold' }}>
          🔌 ElectroLoom
        </Typography>
        <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
          Arduino Simulator & Circuit Designer
        </Typography>
      </Box>

      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Container maxWidth="sm">
          <Box sx={{ 
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            padding: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <Typography variant="h5" gutterBottom>
              Welcome to ElectroLoom
            </Typography>
            <Typography variant="body1" paragraph color="text.secondary">
              Design Arduino circuits visually, write code, and simulate in real-time.
              Perfect for learning, prototyping, and testing without physical hardware.
            </Typography>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                size="large"
                onClick={handleNewProject}
                sx={{ minWidth: 140 }}
              >
                New Project
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                onClick={handleOpenProject}
                sx={{ minWidth: 140 }}
              >
                Open Project
              </Button>
            </Box>

            <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Features: Drag & Drop Circuit Design • Real-time Simulation • 
                Virtual Serial Port • Headless Testing • CI/CD Integration
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ 
        padding: 1, 
        textAlign: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
          ElectroLoom v1.0.0 - Open Source Arduino Simulator
        </Typography>
      </Box>
    </Box>
  );
};

export default App;