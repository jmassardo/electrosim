import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Card,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Refresh as ResetIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Info as InfoIcon,
  Timeline as SimulationIcon,
  Memory as BoardIcon,
  ElectricBolt as VoltageIcon,
  Thermostat as TempIcon,
  Schedule as ClockIcon
} from '@mui/icons-material';

interface SimulationState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  timeStep: number;
  speed: number;
  connectedComponents: number;
  totalComponents: number;
  voltageSupply: number;
  temperature: number;
  powerConsumption: number;
}

interface SimulationMessage {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  timestamp: number;
  component?: string;
}

interface SimulationControlsProps {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  onTimeStepChange?: (timeStep: number) => void;
  simulationState?: SimulationState;
  messages?: SimulationMessage[];
  onMessageDismiss?: (messageId: string) => void;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  onPlay,
  onPause,
  onStop,
  onReset,
  onSpeedChange,
  onTimeStepChange,
  simulationState,
  messages = [],
  onMessageDismiss
}) => {
  const [localState, setLocalState] = useState<SimulationState>({
    isRunning: false,
    isPaused: false,
    currentTime: 0,
    timeStep: 1,
    speed: 1,
    connectedComponents: 5,
    totalComponents: 8,
    voltageSupply: 5.0,
    temperature: 25,
    powerConsumption: 0.125
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoReset, setAutoReset] = useState(false);

  // Use provided state or local state
  const state = simulationState || localState;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state.isRunning && !state.isPaused) {
      interval = setInterval(() => {
        setLocalState(prev => ({
          ...prev,
          currentTime: prev.currentTime + (prev.timeStep * prev.speed),
          powerConsumption: 0.1 + Math.random() * 0.1, // Simulate power fluctuation
          temperature: 25 + (prev.currentTime / 1000) * 0.1 + Math.random() * 2 // Simulate temperature rise
        }));
      }, 100);
    }

    return () => clearInterval(interval);
  }, [state.isRunning, state.isPaused, state.timeStep, state.speed]);

  const handlePlay = () => {
    setLocalState(prev => ({ ...prev, isRunning: true, isPaused: false }));
    onPlay?.();
  };

  const handlePause = () => {
    setLocalState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    onPause?.();
  };

  const handleStop = () => {
    setLocalState(prev => ({ ...prev, isRunning: false, isPaused: false }));
    onStop?.();
  };

  const handleReset = () => {
    setLocalState(prev => ({ 
      ...prev, 
      isRunning: false, 
      isPaused: false, 
      currentTime: 0,
      powerConsumption: 0.125,
      temperature: 25
    }));
    onReset?.();
  };

  const handleSpeedChange = (speed: number) => {
    setLocalState(prev => ({ ...prev, speed }));
    onSpeedChange?.(speed);
  };

  const handleTimeStepChange = (timeStep: number) => {
    setLocalState(prev => ({ ...prev, timeStep }));
    onTimeStepChange?.(timeStep);
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (!state.isRunning) return 'default';
    if (state.isPaused) return 'warning';
    return 'success';
  };

  const getStatusText = () => {
    if (!state.isRunning) return 'Stopped';
    if (state.isPaused) return 'Paused';
    return 'Running';
  };

  const getMessageIcon = (type: SimulationMessage['type']) => {
    switch (type) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'success': return <SuccessIcon color="success" />;
      default: return <InfoIcon color="info" />;
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SimulationIcon />
            <Typography variant="h6">
              Simulation
            </Typography>
          </Box>
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            icon={state.isRunning ? (state.isPaused ? <PauseIcon /> : <PlayIcon />) : <StopIcon />}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Time: {formatTime(state.currentTime)} | Speed: {state.speed}x
        </Typography>
      </Paper>

      {/* Control Buttons */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant={state.isRunning && !state.isPaused ? "contained" : "outlined"}
            startIcon={<PlayIcon />}
            onClick={handlePlay}
            disabled={state.isRunning && !state.isPaused}
            sx={{ flex: 1 }}
          >
            Play
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<PauseIcon />}
            onClick={handlePause}
            disabled={!state.isRunning}
            sx={{ flex: 1 }}
          >
            {state.isPaused ? 'Resume' : 'Pause'}
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<StopIcon />}
            onClick={handleStop}
            disabled={!state.isRunning}
            sx={{ flex: 1 }}
          >
            Stop
          </Button>
          
          <Tooltip title="Reset simulation">
            <IconButton onClick={handleReset} color="primary">
              <ResetIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Speed Control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SpeedIcon color="action" />
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Speed</InputLabel>
            <Select
              value={state.speed}
              label="Speed"
              onChange={(e) => handleSpeedChange(Number(e.target.value))}
            >
              <MenuItem value={0.1}>0.1x</MenuItem>
              <MenuItem value={0.25}>0.25x</MenuItem>
              <MenuItem value={0.5}>0.5x</MenuItem>
              <MenuItem value={1}>1x</MenuItem>
              <MenuItem value={2}>2x</MenuItem>
              <MenuItem value={5}>5x</MenuItem>
              <MenuItem value={10}>10x</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Time Step</InputLabel>
            <Select
              value={state.timeStep}
              label="Time Step"
              onChange={(e) => handleTimeStepChange(Number(e.target.value))}
            >
              <MenuItem value={0.1}>0.1ms</MenuItem>
              <MenuItem value={1}>1ms</MenuItem>
              <MenuItem value={10}>10ms</MenuItem>
              <MenuItem value={100}>100ms</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={autoReset}
              onChange={(e) => setAutoReset(e.target.checked)}
              size="small"
            />
          }
          label="Auto-reset on error"
          sx={{ mt: 1 }}
        />
      </Paper>

      {/* System Status */}
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          System Status
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2 }}>
          <Card variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BoardIcon color="primary" fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Components
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {state.connectedComponents}/{state.totalComponents}
                </Typography>
              </Box>
            </Box>
          </Card>
          
          <Card variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VoltageIcon color="warning" fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Supply Voltage
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {state.voltageSupply.toFixed(1)}V
                </Typography>
              </Box>
            </Box>
          </Card>
          
          <Card variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TempIcon color="info" fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Temperature
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {state.temperature.toFixed(1)}°C
                </Typography>
              </Box>
            </Box>
          </Card>
          
          <Card variant="outlined" sx={{ p: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ClockIcon color="success" fontSize="small" />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Power Usage
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {state.powerConsumption.toFixed(3)}W
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Progress indicator for running simulations */}
        {state.isRunning && !state.isPaused && (
          <Box>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              Simulation Progress
            </Typography>
            <LinearProgress 
              variant="indeterminate" 
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>
        )}
      </Paper>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {messages.length > 0 && (
          <Paper elevation={1} sx={{ mb: 1 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2">
                Messages ({messages.length})
              </Typography>
            </Box>
            
            <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
              {messages.slice(0, 10).map((message) => (
                <ListItem key={message.id}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getMessageIcon(message.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={message.message}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Typography>
                        {message.component && (
                          <Chip
                            label={message.component}
                            size="small"
                            variant="outlined"
                            sx={{ height: 16, fontSize: '0.6rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      size="small"
                      onClick={() => onMessageDismiss?.(message.id)}
                    >
                      ×
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Show sample messages if none provided */}
        {messages.length === 0 && (
          <Alert 
            severity="info" 
            sx={{ mx: 1 }}
            action={
              <Button size="small" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </Button>
            }
          >
            Simulation ready. Messages will appear here during execution.
          </Alert>
        )}

        {/* Advanced Settings */}
        {showAdvanced && (
          <Paper elevation={1} sx={{ m: 1, p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Advanced Settings
            </Typography>
            
            <FormControlLabel
              control={<Switch size="small" />}
              label="Enable voltage monitoring"
              sx={{ display: 'block', mb: 1 }}
            />
            <FormControlLabel
              control={<Switch size="small" defaultChecked />}
              label="Real-time component updates"
              sx={{ display: 'block', mb: 1 }}
            />
            <FormControlLabel
              control={<Switch size="small" />}
              label="Detailed logging"
              sx={{ display: 'block' }}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default SimulationControls;