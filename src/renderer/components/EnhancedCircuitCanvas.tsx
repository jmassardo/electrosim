/**
 * Enhanced CircuitCanvas component with simulation integration
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, IconButton, Tooltip, ButtonGroup } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  FlashOn as FlashOnIcon
} from '@mui/icons-material';

// Import simulation components
import { SimpleSimulationManager } from '../../simulation/core/SimpleSimulationManager';
import { LEDComponent } from '../../simulation/components/LED';
import { ArduinoUnoBoard } from '../../simulation/boards/ArduinoUno';

interface Point {
  x: number;
  y: number;
}

interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

interface CircuitCanvasProps {
  width?: number;
  height?: number;
  onSelectionChange?: (selectedItems: string[]) => void;
  onCanvasClick?: (worldPosition: Point) => void;
}

interface CanvasState {
  transform: ViewportTransform;
  isDragging: boolean;
  lastMousePos: Point | null;
  showGrid: boolean;
  gridSize: number;
  selectedItems: string[];
  isSimulationRunning: boolean;
}

const EnhancedCircuitCanvas: React.FC<CircuitCanvasProps> = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const simulationRef = useRef<SimpleSimulationManager | null>(null);
  
  const [canvasState, setCanvasState] = useState<CanvasState>({
    transform: { x: 200, y: 200, scale: 1 },
    isDragging: false,
    lastMousePos: null,
    showGrid: true,
    gridSize: 20,
    selectedItems: [],
    isSimulationRunning: false
  });

  // Initialize simulation
  useEffect(() => {
    const simulation = new SimpleSimulationManager();
    
    // Create Arduino Uno board
    const arduino = new ArduinoUnoBoard('arduino-1', 'Arduino Uno');
    simulation.addArduinoBoard(arduino, { x: 0, y: 0 });
    
    // Create LED
    const led = new LEDComponent('led-1', 'red');
    simulation.addLED(led, { x: 150, y: 0 });
    
    // Connect LED to Arduino pin 13 and ground
    simulation.connectLEDToArduino('led-1', 'arduino-1', 13);
    simulation.connectLEDToGround('led-1', 'arduino-1');
    
    simulationRef.current = simulation;
    
    return () => {
      simulation.stop();
    };
  }, []);

  // Canvas resize handler
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Animation loop
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (canvasState.showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Save context and apply transform
    ctx.save();
    ctx.translate(canvasState.transform.x, canvasState.transform.y);
    ctx.scale(canvasState.transform.scale, canvasState.transform.scale);

    // Draw origin marker
    drawOrigin(ctx);

    // Draw simulation components
    if (simulationRef.current) {
      drawSimulationComponents(ctx);
      drawConnections(ctx);
    }

    // Restore context
    ctx.restore();

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(draw);
  }, [canvasState]);

  // Start animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  // Draw grid
  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;

    const { transform, gridSize } = canvasState;
    const scaledGridSize = gridSize * transform.scale;

    // Only draw grid if it's not too dense
    if (scaledGridSize > 5) {
      // Calculate grid offset
      const offsetX = transform.x % scaledGridSize;
      const offsetY = transform.y % scaledGridSize;

      // Vertical lines
      for (let x = offsetX; x < width; x += scaledGridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = offsetY; y < height; y += scaledGridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    ctx.restore();
  };

  // Draw origin marker
  const drawOrigin = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // X axis
    ctx.beginPath();
    ctx.moveTo(-50, 0);
    ctx.lineTo(50, 0);
    ctx.stroke();
    
    // Y axis
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(0, 50);
    ctx.stroke();
    
    ctx.restore();
  };

  // Draw simulation components
  const drawSimulationComponents = (ctx: CanvasRenderingContext2D) => {
    if (!simulationRef.current) return;

    const components = simulationRef.current.getAllComponents();
    
    components.forEach(comp => {
      ctx.save();
      
      if (comp.type === 'arduino-uno') {
        drawArduinoBoard(ctx, comp);
      } else if (comp.type === 'led') {
        drawLED(ctx, comp);
      }
      
      ctx.restore();
    });
  };

  // Draw Arduino board
  const drawArduinoBoard = (ctx: CanvasRenderingContext2D, comp: any) => {
    const arduino = comp.component as ArduinoUnoBoard;
    const renderData = arduino.getRenderData();
    const { x, y } = renderData.position;
    const { width, height } = renderData.size;
    
    // Board body
    ctx.fillStyle = '#2d3748';
    ctx.fillRect(x - width/2, y - height/2, width, height);
    
    // Board outline
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - width/2, y - height/2, width, height);
    
    // USB connector
    ctx.fillStyle = '#a0aec0';
    ctx.fillRect(x - width/2 - 5, y - 8, 8, 16);
    
    // Power LED
    ctx.fillStyle = renderData.isRunning ? '#48bb78' : '#68d391';
    ctx.beginPath();
    ctx.arc(x - width/2 + 10, y - height/2 + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Pin 13 LED (built-in)
    const pin13 = arduino.getPin(13);
    ctx.fillStyle = pin13?.digitalValue ? '#f56565' : '#fed7d7';
    ctx.beginPath();
    ctx.arc(x + width/2 - 10, y - height/2 + 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Arduino Uno', x, y + 8);
  };

  // Draw LED component
  const drawLED = (ctx: CanvasRenderingContext2D, comp: any) => {
    const led = comp.component as LEDComponent;
    const renderData = led.getRenderData();
    const { x, y } = renderData.position;
    
    // LED body
    const radius = 10;
    ctx.fillStyle = renderData.isOn ? renderData.color : '#f7fafc';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // LED outline
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Glow effect when on
    if (renderData.isOn) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `${renderData.color}${Math.floor(renderData.brightness * 128).toString(16).padStart(2, '0')}`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Anode (+) and Cathode (-) pins
    ctx.strokeStyle = '#718096';
    ctx.lineWidth = 3;
    
    // Anode (longer pin)
    ctx.beginPath();
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x, y - radius - 15);
    ctx.stroke();
    
    // Cathode (shorter pin)
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + radius + 10);
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#4a5568';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', x, y - radius - 20);
    ctx.fillText('-', x, y + radius + 20);
  };

  // Draw connections
  const drawConnections = (ctx: CanvasRenderingContext2D) => {
    if (!simulationRef.current) return;
    
    const connections = simulationRef.current.getAllConnections();
    
    connections.forEach(connection => {
      ctx.save();
      ctx.strokeStyle = '#e53e3e';
      ctx.lineWidth = 2;
      
      // Simple wire representation
      if (connection.fromComponent === 'arduino-1' && connection.toComponent === 'led-1') {
        if (connection.fromPin === 13) {
          // Pin 13 to LED anode
          ctx.beginPath();
          ctx.moveTo(50, -20); // Arduino pin 13 position
          ctx.lineTo(150, -15); // LED anode position
          ctx.stroke();
        } else if (connection.fromPin === 'GND') {
          // Ground to LED cathode
          ctx.strokeStyle = '#4a5568';
          ctx.beginPath();
          ctx.moveTo(30, 30); // Arduino GND position
          ctx.lineTo(150, 10); // LED cathode position
          ctx.stroke();
        }
      }
      
      ctx.restore();
    });
  };

  // Mouse handlers
  const handleMouseDown = (event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    setCanvasState(prev => ({
      ...prev,
      isDragging: true,
      lastMousePos: point
    }));
  };

  const handleMouseMove = (event: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (canvasState.isDragging && canvasState.lastMousePos) {
      const dx = point.x - canvasState.lastMousePos.x;
      const dy = point.y - canvasState.lastMousePos.y;

      setCanvasState(prev => ({
        ...prev,
        transform: {
          ...prev.transform,
          x: prev.transform.x + dx,
          y: prev.transform.y + dy
        },
        lastMousePos: point
      }));
    }
  };

  const handleMouseUp = () => {
    setCanvasState(prev => ({
      ...prev,
      isDragging: false,
      lastMousePos: null
    }));
  };

  // Control handlers
  const handleZoomIn = () => {
    setCanvasState(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        scale: Math.min(prev.transform.scale * 1.2, 5)
      }
    }));
  };

  const handleZoomOut = () => {
    setCanvasState(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        scale: Math.max(prev.transform.scale / 1.2, 0.1)
      }
    }));
  };

  const handleCenter = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCanvasState(prev => ({
      ...prev,
      transform: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        scale: 1
      }
    }));
  };

  const toggleGrid = () => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  };

  const toggleSimulation = () => {
    if (!simulationRef.current) return;

    if (canvasState.isSimulationRunning) {
      simulationRef.current.stop();
      setCanvasState(prev => ({ ...prev, isSimulationRunning: false }));
    } else {
      simulationRef.current.start();
      setCanvasState(prev => ({ ...prev, isSimulationRunning: true }));
    }
  };

  const toggleLED = () => {
    if (!simulationRef.current) return;
    
    const arduino = simulationRef.current.getArduinoBoard();
    if (arduino) {
      const currentState = arduino.digitalRead(13);
      simulationRef.current.setArduinoPin(13, !currentState);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 1,
        borderBottom: '1px solid #e2e8f0'
      }}>
        {/* Zoom Controls */}
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Zoom In">
            <IconButton onClick={handleZoomIn}>
              <ZoomInIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton onClick={handleZoomOut}>
              <ZoomOutIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Center View">
            <IconButton onClick={handleCenter}>
              <CenterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle Grid">
            <IconButton onClick={toggleGrid}>
              {canvasState.showGrid ? <GridOnIcon /> : <GridOffIcon />}
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        {/* Simulation Controls */}
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Start/Stop Simulation">
            <IconButton onClick={toggleSimulation}>
              {canvasState.isSimulationRunning ? <StopIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Toggle LED">
            <IconButton onClick={toggleLED}>
              <FlashOnIcon />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Box>

      {/* Canvas Container */}
      <Box 
        ref={containerRef}
        sx={{ 
          flex: 1, 
          position: 'relative',
          overflow: 'hidden',
          cursor: canvasState.isDragging ? 'grabbing' : 'grab'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </Box>

      {/* Status Bar */}
      <Box sx={{ 
        p: 1, 
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <span>Scale: {Math.round(canvasState.transform.scale * 100)}%</span>
        <span>
          Status: {canvasState.isSimulationRunning ? 'Running' : 'Stopped'}
        </span>
      </Box>
    </Box>
  );
};

export default EnhancedCircuitCanvas;