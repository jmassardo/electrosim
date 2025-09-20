import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Button, 
  AppBar,
  Toolbar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Minimize as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Close as CloseIcon,
  Memory as MemoryIcon
} from '@mui/icons-material';

const App: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);

  useEffect(() => {
    // Initialize the application
    console.log('ElectroSim Arduino Simulator initializing...');
    
    // Setup cleanup function
    let cleanup: (() => void) | undefined;
    
    // Check if we're running in Electron
    if (window.electronAPI && window.electronAPI.menu) {
      console.log('Running in Electron environment');
      
      // Set up menu event listeners
      window.electronAPI.menu.onNewProject(() => {
        console.log('Menu: New Project requested');
        handleNewProject();
      });

      window.electronAPI.menu.onOpenProject(() => {
        console.log('Menu: Open Project requested');
        handleOpenProject();
      });

      window.electronAPI.menu.onSaveProject(() => {
        console.log('Menu: Save Project requested');
        // TODO: Implement save functionality
      });

      window.electronAPI.menu.onAbout(() => {
        console.log('Menu: About requested');
        setShowAboutDialog(true);
      });

      window.electronAPI.menu.onSimulationStart(() => {
        console.log('Menu: Start simulation requested');
        // TODO: Implement simulation controls
      });

      // Setup cleanup function for Electron
      cleanup = () => {
        if (window.electronAPI && window.electronAPI.menu) {
          window.electronAPI.menu.removeAllListeners();
        }
      };
    } else {
      console.log('Running in browser environment (development)');
    }

    // Return cleanup function (may be undefined for non-Electron)
    return cleanup;
  }, []);

  const handleNewProject = () => {
    console.log('Creating new project...');
    // TODO: Implement new project creation
  };

  const handleOpenProject = async () => {
    if (window.electronAPI && window.electronAPI.project) {
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

  const handleWindowControl = async (action: 'minimize' | 'maximize' | 'close') => {
    if (window.electronAPI && window.electronAPI.window) {
      try {
        switch (action) {
          case 'minimize':
            await window.electronAPI.window.minimize();
            break;
          case 'maximize':
            await window.electronAPI.window.maximize();
            setIsMaximized(!isMaximized);
            break;
          case 'close':
            await window.electronAPI.window.close();
            break;
        }
      } catch (error) {
        console.error(`Failed to ${action} window:`, error);
      }
    }
  };

  const isElectron = !!window.electronAPI;

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overflow: 'hidden'
    }}>
      {/* Custom Title Bar for Electron */}
      {isElectron && (
        <AppBar 
          position="static" 
          sx={{ 
            backgroundColor: 'rgba(47, 51, 73, 0.95)', 
            backdropFilter: 'blur(10px)',
            minHeight: '32px',
            '& .MuiToolbar-root': {
              minHeight: '32px',
              paddingTop: 0,
              paddingBottom: 0,
            }
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '32px !important' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MemoryIcon sx={{ fontSize: 18, color: '#60a5fa' }} />
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
                ElectroSim
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex' }}>
              <IconButton
                size="small"
                onClick={() => handleWindowControl('minimize')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  borderRadius: 0,
                  width: 32,
                  height: 32
                }}
              >
                <MinimizeIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleWindowControl('maximize')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                  borderRadius: 0,
                  width: 32,
                  height: 32
                }}
              >
                <MaximizeIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleWindowControl('close')}
                sx={{ 
                  color: 'rgba(255,255,255,0.7)', 
                  '&:hover': { backgroundColor: 'rgba(255,0,0,0.5)' },
                  borderRadius: 0,
                  width: 32,
                  height: 32
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Header */}
      <Box sx={{ 
        padding: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <Typography variant="h4" component="h1" sx={{ color: 'white', fontWeight: 'bold' }}>
          🔌 ElectroSim
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
              Welcome to ElectroSim
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
          ElectroSim v1.0.0 - Open Source Arduino Simulator
        </Typography>
      </Box>

      {/* About Dialog */}
      <Dialog 
        open={showAboutDialog} 
        onClose={() => setShowAboutDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
          About ElectroSim
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <MemoryIcon sx={{ fontSize: 48, color: '#60a5fa', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              ElectroSim v1.0.0
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cross-platform Arduino circuit simulator and designer
            </Typography>
          </Box>
          
          <Typography variant="body2" paragraph>
            ElectroSim is an open-source tool for designing and simulating Arduino circuits 
            without physical hardware. Perfect for education, prototyping, and development.
          </Typography>
          
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Built with:</strong> Electron, React, TypeScript, AVR8js
          </Typography>
          <Typography variant="body2">
            <strong>License:</strong> MIT License
          </Typography>
          <Typography variant="body2">
            <strong>GitHub:</strong> github.com/jmassardo/electrosim
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAboutDialog(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default App;