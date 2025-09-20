import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Typography
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  FolderOpen as OpenIcon,
  Add as NewIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Cable as CableIcon
} from '@mui/icons-material';

interface ApplicationToolbarProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onSimulationStart: () => void;
  onSimulationPause: () => void;
  onSimulationStop: () => void;
  onSimulationReset: () => void;
  simulationState: 'stopped' | 'running' | 'paused';
  hasUnsavedChanges: boolean;
}

const ApplicationToolbar: React.FC<ApplicationToolbarProps> = ({
  onNewProject,
  onOpenProject,
  onSave,
  onSimulationStart,
  onSimulationPause,
  onSimulationStop,
  onSimulationReset,
  simulationState,
  hasUnsavedChanges
}) => {
  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        color: '#1e293b'
      }}
    >
      <Toolbar variant="dense" sx={{ gap: 2, minHeight: 48 }}>
        {/* Project Actions */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="New Project (Ctrl+N)">
            <Button
              variant="outlined"
              size="small"
              startIcon={<NewIcon />}
              onClick={onNewProject}
              sx={{ 
                borderColor: '#e2e8f0',
                color: '#475569',
                '&:hover': { borderColor: '#60a5fa', backgroundColor: '#f1f5f9' }
              }}
            >
              New
            </Button>
          </Tooltip>
          
          <Tooltip title="Open Project (Ctrl+O)">
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenIcon />}
              onClick={onOpenProject}
              sx={{ 
                borderColor: '#e2e8f0',
                color: '#475569',
                '&:hover': { borderColor: '#60a5fa', backgroundColor: '#f1f5f9' }
              }}
            >
              Open
            </Button>
          </Tooltip>
          
          <Tooltip title="Save Project (Ctrl+S)">
            <Button
              variant={hasUnsavedChanges ? "contained" : "outlined"}
              size="small"
              startIcon={<SaveIcon />}
              onClick={onSave}
              sx={{ 
                borderColor: hasUnsavedChanges ? '#f59e0b' : '#e2e8f0',
                backgroundColor: hasUnsavedChanges ? '#f59e0b' : 'transparent',
                color: hasUnsavedChanges ? '#ffffff' : '#475569',
                '&:hover': { 
                  borderColor: '#f59e0b', 
                  backgroundColor: hasUnsavedChanges ? '#d97706' : '#fef3c7' 
                }
              }}
            >
              Save
            </Button>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* Simulation Controls */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Typography variant="caption" sx={{ 
            alignSelf: 'center', 
            color: '#64748b',
            mr: 1,
            fontWeight: 500
          }}>
            Simulation:
          </Typography>
          
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="Start/Resume (F5)">
              <Button
                onClick={simulationState === 'paused' ? onSimulationStart : onSimulationStart}
                disabled={simulationState === 'running'}
                sx={{
                  color: simulationState === 'running' ? '#10b981' : '#475569',
                  borderColor: simulationState === 'running' ? '#10b981' : '#e2e8f0',
                  '&:hover': { borderColor: '#10b981', backgroundColor: '#f0fdf4' }
                }}
              >
                <PlayIcon fontSize="small" />
              </Button>
            </Tooltip>
            
            <Tooltip title="Pause (F6)">
              <Button
                onClick={onSimulationPause}
                disabled={simulationState !== 'running'}
                sx={{
                  color: '#f59e0b',
                  borderColor: '#e2e8f0',
                  '&:hover': { borderColor: '#f59e0b', backgroundColor: '#fef3c7' }
                }}
              >
                <PauseIcon fontSize="small" />
              </Button>
            </Tooltip>
            
            <Tooltip title="Stop (Shift+F5)">
              <Button
                onClick={onSimulationStop}
                disabled={simulationState === 'stopped'}
                sx={{
                  color: '#ef4444',
                  borderColor: '#e2e8f0',
                  '&:hover': { borderColor: '#ef4444', backgroundColor: '#fef2f2' }
                }}
              >
                <StopIcon fontSize="small" />
              </Button>
            </Tooltip>
            
            <Tooltip title="Reset Arduino (F7)">
              <Button
                onClick={onSimulationReset}
                sx={{
                  color: '#8b5cf6',
                  borderColor: '#e2e8f0',
                  '&:hover': { borderColor: '#8b5cf6', backgroundColor: '#faf5ff' }
                }}
              >
                <ResetIcon fontSize="small" />
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Status Indicators */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            icon={<MemoryIcon />}
            label={`${simulationState.toUpperCase()}`}
            size="small"
            variant="outlined"
            sx={{
              backgroundColor: 
                simulationState === 'running' ? '#dcfce7' :
                simulationState === 'paused' ? '#fef3c7' : '#f1f5f9',
              borderColor:
                simulationState === 'running' ? '#10b981' :
                simulationState === 'paused' ? '#f59e0b' : '#64748b',
              color:
                simulationState === 'running' ? '#166534' :
                simulationState === 'paused' ? '#92400e' : '#475569',
              fontWeight: 500
            }}
          />
          
          <Chip
            icon={<CableIcon />}
            label="No Arduino"
            size="small"
            variant="outlined"
            sx={{
              backgroundColor: '#fef2f2',
              borderColor: '#fca5a5',
              color: '#991b1b',
              fontWeight: 500
            }}
          />

          <Tooltip title="Settings">
            <IconButton size="small" sx={{ color: '#64748b' }}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ApplicationToolbar;