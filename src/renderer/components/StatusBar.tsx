import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Pause as PauseIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Wifi as ConnectionIcon,
  WifiOff as DisconnectedIcon
} from '@mui/icons-material';

interface StatusMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

interface SimulationStatus {
  state: 'stopped' | 'running' | 'paused' | 'compiling';
  progress?: number;
  speed: string;
  memoryUsage: number;
  componentCount: number;
  connectionCount: number;
  isConnected: boolean;
}

const MOCK_STATUS: SimulationStatus = {
  state: 'stopped',
  speed: '1x',
  memoryUsage: 45,
  componentCount: 8,
  connectionCount: 12,
  isConnected: true
};

const MOCK_MESSAGE: StatusMessage = {
  type: 'info',
  message: 'Ready to simulate circuit',
  timestamp: new Date()
};

const StatusBar: React.FC = () => {
  const [status] = React.useState<SimulationStatus>(MOCK_STATUS);
  const [currentMessage] = React.useState<StatusMessage>(MOCK_MESSAGE);

  const getStatusIcon = () => {
    switch (currentMessage.type) {
      case 'success':
        return <CheckCircleIcon fontSize="small" sx={{ color: '#10b981' }} />;
      case 'error':
        return <ErrorIcon fontSize="small" sx={{ color: '#ef4444' }} />;
      case 'warning':
        return <WarningIcon fontSize="small" sx={{ color: '#f59e0b' }} />;
      case 'info':
      default:
        return <InfoIcon fontSize="small" sx={{ color: '#60a5fa' }} />;
    }
  };

  const getSimulationStateColor = () => {
    switch (status.state) {
      case 'running':
        return '#10b981';
      case 'paused':
        return '#f59e0b';
      case 'compiling':
        return '#60a5fa';
      case 'stopped':
      default:
        return '#64748b';
    }
  };

  const getSimulationStateIcon = () => {
    switch (status.state) {
      case 'running':
        return <PlayIcon fontSize="small" />;
      case 'paused':
        return <PauseIcon fontSize="small" />;
      case 'compiling':
        return <MemoryIcon fontSize="small" />;
      case 'stopped':
      default:
        return <StopIcon fontSize="small" />;
    }
  };

  return (
    <Box sx={{ 
      height: 32,
      backgroundColor: '#2f3349',
      borderTop: '1px solid #404354',
      display: 'flex',
      alignItems: 'center',
      px: 2,
      color: 'white',
      fontSize: '0.8125rem'
    }}>
      {/* Status Message */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        flex: 1,
        minWidth: 0
      }}>
        {getStatusIcon()}
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'white', 
            fontSize: '0.8125rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {currentMessage.message}
        </Typography>
        {status.state === 'compiling' && status.progress !== undefined && (
          <LinearProgress 
            variant="determinate" 
            value={status.progress}
            sx={{ 
              width: 100,
              height: 4,
              backgroundColor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#60a5fa'
              }
            }}
          />
        )}
      </Box>

      {/* Simulation Status */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderLeft: '1px solid #404354',
        pl: 2,
        ml: 2
      }}>
        <Tooltip title="Simulation State">
          <Chip
            icon={getSimulationStateIcon()}
            label={status.state.charAt(0).toUpperCase() + status.state.slice(1)}
            size="small"
            sx={{
              backgroundColor: getSimulationStateColor(),
              color: 'white',
              height: 20,
              fontSize: '0.75rem',
              '& .MuiChip-icon': {
                color: 'white'
              }
            }}
          />
        </Tooltip>

        <Tooltip title="Simulation Speed">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SpeedIcon fontSize="small" sx={{ color: '#94a3b8' }} />
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8125rem' }}>
              {status.speed}
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Circuit Statistics */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2,
        borderLeft: '1px solid #404354',
        pl: 2,
        ml: 2
      }}>
        <Tooltip title="Components">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <MemoryIcon fontSize="small" sx={{ color: '#94a3b8' }} />
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8125rem' }}>
              {status.componentCount}
            </Typography>
          </Box>
        </Tooltip>

        <Tooltip title="Connections">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {status.isConnected ? (
              <ConnectionIcon fontSize="small" sx={{ color: '#10b981' }} />
            ) : (
              <DisconnectedIcon fontSize="small" sx={{ color: '#ef4444' }} />
            )}
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8125rem' }}>
              {status.connectionCount}
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Memory Usage */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        borderLeft: '1px solid #404354',
        pl: 2,
        ml: 2
      }}>
        <Tooltip title={`Memory Usage: ${status.memoryUsage}%`}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
              Mem:
            </Typography>
            <Box sx={{ 
              width: 60, 
              height: 8, 
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <Box sx={{
                width: `${status.memoryUsage}%`,
                height: '100%',
                backgroundColor: status.memoryUsage > 80 ? '#ef4444' : 
                               status.memoryUsage > 60 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease'
              }} />
            </Box>
            <Typography variant="body2" sx={{ color: 'white', fontSize: '0.8125rem', minWidth: 30 }}>
              {status.memoryUsage}%
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Timestamp */}
      <Box sx={{ 
        borderLeft: '1px solid #404354',
        pl: 2,
        ml: 2
      }}>
        <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
          {currentMessage.timestamp.toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default StatusBar;