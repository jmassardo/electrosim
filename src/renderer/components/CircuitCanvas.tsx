import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Paper, IconButton, Tooltip, ButtonGroup } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  Fullscreen as FitIcon,
  OpenWith as SnapIcon
} from '@mui/icons-material';
import {
  Point,
  ViewportTransform,
  CanvasTransform,
  GridUtils,
  MouseUtils,
  GeometryUtils,
  BoundingBox
} from '../utils/canvasUtils';

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
  snapToGrid: boolean;
  selectedItems: string[];
  isSelecting: boolean;
  selectionStart: Point | null;
}

interface CircuitComponent {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  type: string;
}

const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  onCanvasClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  // Mock components data - this will eventually come from props or state management
  const [components] = useState<CircuitComponent[]>([
    { id: 'arduino-1', x: 0, y: 0, width: 80, height: 40, label: 'Arduino', type: 'board' },
    { id: 'led-1', x: 120, y: -20, width: 20, height: 20, label: 'LED', type: 'led' },
    { id: 'resistor-1', x: -100, y: 50, width: 30, height: 15, label: 'R1', type: 'resistor' }
  ]);
  
  const [canvasState, setCanvasState] = useState<CanvasState>({
    transform: { x: 0, y: 0, scale: 1 },
    isDragging: false,
    lastMousePos: null,
    showGrid: true,
    gridSize: 20,
    snapToGrid: true,
    selectedItems: [],
    isSelecting: false,
    selectionStart: null
  });

  const canvasTransform = useRef(new CanvasTransform(canvasState.transform));

  // Update transform when state changes
  useEffect(() => {
    canvasTransform.current.setTransform(canvasState.transform);
  }, [canvasState.transform]);

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (canvasState.showGrid) {
      GridUtils.drawGrid(
        ctx,
        canvasState.transform,
        { x: canvas.width, y: canvas.height },
        canvasState.gridSize,
        canvasState.transform.scale < 0.5 ? '#f8fafc' : '#f1f5f9',
        1
      );
      
      // Draw major grid lines every 5 grid units
      if (canvasState.transform.scale > 0.8) {
        GridUtils.drawGrid(
          ctx,
          canvasState.transform,
          { x: canvas.width, y: canvas.height },
          canvasState.gridSize * 5,
          '#e2e8f0',
          2
        );
      }
    }

    // Apply transform for drawing world objects
    canvasTransform.current.applyToContext(ctx);

    // Draw placeholder content
    drawPlaceholderContent(ctx);

    // Restore context
    canvasTransform.current.restoreContext(ctx);

    // Draw UI overlays (screen space)
    drawUIOverlays(ctx, canvas);
  }, [canvasState]);

  // Draw placeholder content (this will be replaced with actual components)
  const drawPlaceholderContent = useCallback((ctx: CanvasRenderingContext2D) => {
    // Draw origin marker
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

    // Draw components
    components.forEach(comp => {
      const isSelected = canvasState.selectedItems.includes(comp.id);
      
      ctx.save();
      
      // Draw selection highlight if selected
      if (isSelected) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.strokeRect(comp.x - 2, comp.y - 2, comp.width + 4, comp.height + 4);
        
        // Draw selection corner handles
        const handleSize = 6;
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(comp.x - handleSize / 2, comp.y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(comp.x + comp.width - handleSize / 2, comp.y - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(comp.x - handleSize / 2, comp.y + comp.height - handleSize / 2, handleSize, handleSize);
        ctx.fillRect(comp.x + comp.width - handleSize / 2, comp.y + comp.height - handleSize / 2, handleSize, handleSize);
      }
      
      // Component body
      ctx.fillStyle = isSelected ? '#e0f2fe' : '#ffffff';
      ctx.strokeStyle = isSelected ? '#60a5fa' : '#374151';
      ctx.lineWidth = 2;
      ctx.fillRect(comp.x, comp.y, comp.width, comp.height);
      ctx.strokeRect(comp.x, comp.y, comp.width, comp.height);
      
      // Label
      ctx.fillStyle = '#374151';
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        comp.label,
        comp.x + comp.width / 2,
        comp.y + comp.height / 2
      );
      
      ctx.restore();
    });

    // Draw selection rectangle if selecting
    if (canvasState.isSelecting && canvasState.selectionStart && canvasState.lastMousePos) {
      const worldStart = canvasTransform.current.screenToWorld(canvasState.selectionStart);
      const worldEnd = canvasTransform.current.screenToWorld(canvasState.lastMousePos);
      
      ctx.save();
      ctx.strokeStyle = '#60a5fa';
      ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      const x = Math.min(worldStart.x, worldEnd.x);
      const y = Math.min(worldStart.y, worldEnd.y);
      const width = Math.abs(worldEnd.x - worldStart.x);
      const height = Math.abs(worldEnd.y - worldStart.y);
      
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
      ctx.restore();
    }
  }, [components, canvasState.selectedItems, canvasState.isSelecting, canvasState.selectionStart, canvasState.lastMousePos]);

  // Draw UI overlays in screen space
  const drawUIOverlays = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Draw zoom level indicator
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 30, 80, 20);
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(canvasState.transform.scale * 100)}%`,
      15,
      canvas.height - 20
    );
    ctx.restore();

    // Draw coordinates indicator when hovering or dragging
    if (canvasState.lastMousePos) {
      let worldPos = canvasTransform.current.screenToWorld(canvasState.lastMousePos);
      const originalWorldPos = { ...worldPos };
      
      if (canvasState.snapToGrid) {
        worldPos = GridUtils.snapToGrid(worldPos, canvasState.gridSize);
      }

      ctx.save();
      
      // Background for coordinates display
      const coordText = `${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`;
      const coordWidth = ctx.measureText(coordText).width + 20;
      
      if (canvasState.isDragging) {
        ctx.fillStyle = 'rgba(96, 165, 250, 0.9)';
      } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      }
      ctx.fillRect(10, 10, coordWidth, 20);
      
      // Coordinates text
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(coordText, 15, 20);
      
      // Show snap indicator if enabled and position changed
      if (canvasState.snapToGrid && (originalWorldPos.x !== worldPos.x || originalWorldPos.y !== worldPos.y)) {
        const screenPos = canvasTransform.current.worldToScreen(worldPos);
        
        // Draw snap indicator circle
        ctx.strokeStyle = '#60a5fa';
        ctx.fillStyle = 'rgba(96, 165, 250, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw crosshair
        ctx.beginPath();
        ctx.moveTo(screenPos.x - 4, screenPos.y);
        ctx.lineTo(screenPos.x + 4, screenPos.y);
        ctx.moveTo(screenPos.x, screenPos.y - 4);
        ctx.lineTo(screenPos.x, screenPos.y + 4);
        ctx.stroke();
      }
      
      ctx.restore();
    }
  }, [canvasState.isDragging, canvasState.lastMousePos, canvasState.transform]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [draw]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePos = MouseUtils.getMousePosition(event.nativeEvent, canvas);
    
    if (event.button === 0) { // Left click
      let worldPos = canvasTransform.current.screenToWorld(mousePos);
      
      // Apply snap-to-grid if enabled
      if (canvasState.snapToGrid) {
        worldPos = GridUtils.snapToGrid(worldPos, canvasState.gridSize);
      }
      
      // Check for component selection
      const clickedComponent = components.find(comp =>
        GeometryUtils.pointInRect(worldPos, {
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height
        })
      );
      
      if (clickedComponent) {
        // Handle component selection
        if (event.metaKey || event.ctrlKey) {
          // Multi-select with Cmd/Ctrl
          const isAlreadySelected = canvasState.selectedItems.includes(clickedComponent.id);
          const newSelectedItems = isAlreadySelected
            ? canvasState.selectedItems.filter(id => id !== clickedComponent.id)
            : [...canvasState.selectedItems, clickedComponent.id];
          
          setCanvasState(prev => ({
            ...prev,
            selectedItems: newSelectedItems
          }));
        } else {
          // Single select
          setCanvasState(prev => ({
            ...prev,
            selectedItems: [clickedComponent.id]
          }));
        }
      } else {
        // Clear selection and start drag selection
        if (!(event.metaKey || event.ctrlKey)) {
          setCanvasState(prev => ({
            ...prev,
            selectedItems: [],
            isSelecting: true,
            selectionStart: mousePos
          }));
        }
      }
      
      onCanvasClick?.(worldPos);
      
      setCanvasState(prev => ({
        ...prev,
        isDragging: true,
        lastMousePos: mousePos
      }));
    }
  }, [onCanvasClick, components, canvasState.selectedItems, canvasState.snapToGrid, canvasState.gridSize]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePos = MouseUtils.getMousePosition(event.nativeEvent, canvas);

    if (canvasState.isDragging && canvasState.lastMousePos) {
      const delta = {
        x: mousePos.x - canvasState.lastMousePos.x,
        y: mousePos.y - canvasState.lastMousePos.y
      };

      setCanvasState(prev => ({
        ...prev,
        transform: {
          ...prev.transform,
          x: prev.transform.x + delta.x,
          y: prev.transform.y + delta.y
        },
        lastMousePos: mousePos
      }));
    } else {
      setCanvasState(prev => ({
        ...prev,
        lastMousePos: mousePos
      }));
    }
  }, [canvasState.isDragging, canvasState.lastMousePos]);

  const handleMouseUp = useCallback(() => {
    if (canvasState.isSelecting && canvasState.selectionStart && canvasState.lastMousePos) {
      // Complete drag selection
      const worldStart = canvasTransform.current.screenToWorld(canvasState.selectionStart);
      const worldEnd = canvasTransform.current.screenToWorld(canvasState.lastMousePos);
      
      const selectionRect = {
        x: Math.min(worldStart.x, worldEnd.x),
        y: Math.min(worldStart.y, worldEnd.y),
        width: Math.abs(worldEnd.x - worldStart.x),
        height: Math.abs(worldEnd.y - worldStart.y)
      };
      
      // Find components that intersect with the selection rectangle
      const selectedComponents = components.filter(comp =>
        GeometryUtils.rectIntersect(selectionRect, {
          x: comp.x,
          y: comp.y,
          width: comp.width,
          height: comp.height
        })
      );
      
      setCanvasState(prev => ({
        ...prev,
        selectedItems: selectedComponents.map(comp => comp.id),
        isSelecting: false,
        selectionStart: null,
        isDragging: false,
        lastMousePos: null
      }));
    } else {
      setCanvasState(prev => ({
        ...prev,
        isDragging: false,
        lastMousePos: null,
        isSelecting: false,
        selectionStart: null
      }));
    }
  }, [canvasState.isSelecting, canvasState.selectionStart, canvasState.lastMousePos, components]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePos = MouseUtils.getMousePosition(event.nativeEvent, canvas);
    const wheelDelta = MouseUtils.getWheelDelta(event.nativeEvent);
    
    const scaleFactor = Math.pow(1.1, wheelDelta);
    const newScale = Math.max(0.1, Math.min(5, canvasState.transform.scale * scaleFactor));
    
    if (newScale !== canvasState.transform.scale) {
      const worldPoint = canvasTransform.current.screenToWorld(mousePos);
      
      setCanvasState(prev => {
        const newTransform = { ...prev.transform, scale: newScale };
        const newCanvasTransform = new CanvasTransform(newTransform);
        const newScreenPoint = newCanvasTransform.worldToScreen(worldPoint);
        
        return {
          ...prev,
          transform: {
            ...newTransform,
            x: newTransform.x + mousePos.x - newScreenPoint.x,
            y: newTransform.y + mousePos.y - newScreenPoint.y
          }
        };
      });
    }
  }, [canvasState.transform]);

  // Canvas control handlers
  const handleZoomIn = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        scale: Math.min(5, prev.transform.scale * 1.25)
      }
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      transform: {
        ...prev.transform,
        scale: Math.max(0.1, prev.transform.scale * 0.8)
      }
    }));
  }, []);

  const handleResetView = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      transform: { x: 0, y: 0, scale: 1 }
    }));
  }, []);

  const handleToggleGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid
    }));
  }, []);

  const handleToggleSnap = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      snapToGrid: !prev.snapToGrid
    }));
  }, []);

  const handleFitToView = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // For now, just reset - in the future this will fit to actual content
    const contentBounds: BoundingBox = { x: -150, y: -75, width: 300, height: 150 };
    const viewportSize: Point = { x: canvas.width, y: canvas.height };
    
    const newTransform = new CanvasTransform();
    newTransform.fitToViewport(contentBounds, viewportSize);
    
    setCanvasState(prev => ({
      ...prev,
      transform: newTransform.getTransform()
    }));
  }, []);

  // Canvas size management
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Box sx={{ 
      position: 'relative',
      height: '100%',
      width: '100%',
      overflow: 'hidden'
    }}>
      {/* Canvas Container */}
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: canvasState.isDragging ? 'grabbing' : 'grab'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{
            display: 'block',
            width: '100%',
            height: '100%'
          }}
        />
      </Box>

      {/* Canvas Controls */}
      <Paper
        elevation={2}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          p: 0.5,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <ButtonGroup orientation="vertical" size="small">
          <Tooltip title="Zoom In" placement="left">
            <IconButton onClick={handleZoomIn} size="small">
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out" placement="left">
            <IconButton onClick={handleZoomOut} size="small">
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Fit to View" placement="left">
            <IconButton onClick={handleFitToView} size="small">
              <FitIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View" placement="left">
            <IconButton onClick={handleResetView} size="small">
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={canvasState.showGrid ? "Hide Grid" : "Show Grid"} placement="left">
            <IconButton onClick={handleToggleGrid} size="small">
              {canvasState.showGrid ? <GridOnIcon fontSize="small" /> : <GridOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={canvasState.snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"} placement="left">
            <IconButton 
              onClick={handleToggleSnap} 
              size="small"
              sx={{ 
                color: canvasState.snapToGrid ? '#60a5fa' : 'inherit',
                backgroundColor: canvasState.snapToGrid ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
              }}
            >
              <SnapIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>
      </Paper>
    </Box>
  );
};

export default CircuitCanvas;