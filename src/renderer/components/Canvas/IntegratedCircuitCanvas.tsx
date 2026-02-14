/**
 * Enhanced CircuitCanvas with full integration
 */
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Box, Paper, IconButton, Tooltip, ButtonGroup } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  Fullscreen as FitIcon,
  OpenWith as SnapIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import { 
  Point, 
  CanvasComponent, 
  CanvasState, 
  Wire,
  Transform,
  PinLocation,
  Rectangle
} from './types';
import { DragDropHandler } from './DragDropHandler';
import { WiringSystem } from './WiringSystem';
import { ComponentVisualFactory } from './ComponentVisuals';
import { 
  CanvasTransform,
  GridUtils,
  MouseUtils,
  GeometryUtils
} from '../../utils/canvasUtils';

interface IntegratedCircuitCanvasProps {
  width?: number;
  height?: number;
  onSelectionChange?: (selectedItems: string[]) => void;
  onCanvasClick?: (worldPosition: Point) => void;
  onComponentAdd?: (component: CanvasComponent) => void;
  onComponentUpdate?: (componentId: string, updates: Partial<CanvasComponent>) => void;
  onComponentDelete?: (componentId: string) => void;
  onWireAdd?: (wire: Wire) => void;
  onWireDelete?: (wireId: string) => void;
}

interface HistoryEntry {
  action: string;
  data: any;
  timestamp: number;
}

const IntegratedCircuitCanvas: React.FC<IntegratedCircuitCanvasProps> = ({
  onSelectionChange,
  onCanvasClick,
  onComponentAdd,
  onComponentUpdate,
  onComponentDelete,
  onWireAdd,
  onWireDelete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  
  const [canvasState, setCanvasState] = useState<CanvasState>({
    components: [],
    wires: [],
    selectedItems: [],
    viewTransform: { x: 0, y: 0, scale: 1 },
    gridVisible: true,
    gridSize: 20,
    snapToGrid: true,
    isDragging: false,
    lastMousePos: null,
    isWiring: false
  });

  // History management for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const canvasTransform = useRef(new CanvasTransform(canvasState.viewTransform));
  const dragDropHandler = useRef(new DragDropHandler({
    onComponentDrop: handleComponentDrop
  }));
  const wiringSystem = useRef(new WiringSystem({
    onWireComplete: handleWireComplete,
    onWireDelete: handleWireDelete
  }));

  // Update transform when state changes
  useEffect(() => {
    canvasTransform.current.setTransform(canvasState.viewTransform);
  }, [canvasState.viewTransform]);

  // Component management
  function handleComponentDrop(componentType: string, position: Point): CanvasComponent | null {
    const worldPos = canvasTransform.current.screenToWorld(position);
    const snappedPos = canvasState.snapToGrid ? 
      GridUtils.snapToGrid(worldPos, canvasState.gridSize) : worldPos;

    const newComponent: CanvasComponent = {
      id: `${componentType}_${Date.now()}`,
      type: componentType,
      position: snappedPos,
      rotation: 0,
      properties: getDefaultProperties(componentType),
      pins: getDefaultPins(componentType),
      boundingBox: { x: snappedPos.x - 20, y: snappedPos.y - 20, width: 40, height: 40 },
      selected: false
    };

    setCanvasState(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));

    addToHistory('add_component', { component: newComponent });
    onComponentAdd?.(newComponent);
    
    return newComponent;
  }

  function handleWireComplete(wire: Wire): void {
    setCanvasState(prev => ({
      ...prev,
      wires: [...prev.wires, wire],
      isWiring: false
    }));

    addToHistory('add_wire', { wire });
    onWireAdd?.(wire);
  }

  function handleWireDelete(wireId: string): void {
    const wireToDelete = canvasState.wires.find(w => w.id === wireId);
    if (wireToDelete) {
      setCanvasState(prev => ({
        ...prev,
        wires: prev.wires.filter(w => w.id !== wireId)
      }));

      addToHistory('delete_wire', { wire: wireToDelete });
      onWireDelete?.(wireId);
    }
  }

  // History management
  function addToHistory(action: string, data: any): void {
    const entry: HistoryEntry = {
      action,
      data,
      timestamp: Date.now()
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(entry);
      return newHistory.slice(-50); // Keep last 50 actions
    });
    
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }

  function handleUndo(): void {
    if (historyIndex >= 0) {
      const entry = history[historyIndex];
      performUndoAction(entry);
      setHistoryIndex(prev => prev - 1);
    }
  }

  function handleRedo(): void {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      performRedoAction(entry);
      setHistoryIndex(prev => prev + 1);
    }
  }

  function performUndoAction(entry: HistoryEntry): void {
    switch (entry.action) {
      case 'add_component':
        setCanvasState(prev => ({
          ...prev,
          components: prev.components.filter(c => c.id !== entry.data.component.id)
        }));
        break;
      case 'delete_component':
        setCanvasState(prev => ({
          ...prev,
          components: [...prev.components, entry.data.component]
        }));
        break;
      case 'add_wire':
        setCanvasState(prev => ({
          ...prev,
          wires: prev.wires.filter(w => w.id !== entry.data.wire.id)
        }));
        break;
      case 'delete_wire':
        setCanvasState(prev => ({
          ...prev,
          wires: [...prev.wires, entry.data.wire]
        }));
        break;
    }
  }

  function performRedoAction(entry: HistoryEntry): void {
    switch (entry.action) {
      case 'add_component':
        setCanvasState(prev => ({
          ...prev,
          components: [...prev.components, entry.data.component]
        }));
        break;
      case 'delete_component':
        setCanvasState(prev => ({
          ...prev,
          components: prev.components.filter(c => c.id !== entry.data.component.id)
        }));
        break;
      case 'add_wire':
        setCanvasState(prev => ({
          ...prev,
          wires: [...prev.wires, entry.data.wire]
        }));
        break;
      case 'delete_wire':
        setCanvasState(prev => ({
          ...prev,
          wires: prev.wires.filter(w => w.id !== entry.data.wire.id)
        }));
        break;
    }
  }

  // Drawing function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!if (!canvas) return;) return undefined;

    const ctx = canvas.getContext('2d');
    if (!if (!ctx) return;) return undefined;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (canvasState.gridVisible) {
      GridUtils.drawGrid(
        ctx,
        canvasState.viewTransform,
        { x: canvas.width, y: canvas.height },
        canvasState.gridSize,
        '#f1f5f9',
        1
      );
    }

    // Apply world transform
    canvasTransform.current.applyToContext(ctx);

    // Draw wires first (behind components)
    canvasState.wires.forEach(wire => {
      wiringSystem.current.renderWire(ctx, wire);
    });

    // Draw wire preview if wiring
    if (canvasState.isWiring) {
      wiringSystem.current.renderWirePreview(ctx);
    }

    // Draw components
    canvasState.components.forEach(component => {
      const visual = ComponentVisualFactory.getVisual(component.type);
      if (visual) {
        visual.render(ctx, component);
      }
    });

    // Restore context
    canvasTransform.current.restoreContext(ctx);

    // Draw UI overlays in screen space
    drawUIOverlays(ctx, canvas);
  }, [canvasState]);

  // Draw UI overlays
  const drawUIOverlays = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    // Zoom level indicator
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 30, 80, 20);
    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(canvasState.viewTransform.scale * 100)}%`,
      15,
      canvas.height - 20
    );
    ctx.restore();

    // Coordinates indicator
    if (canvasState.lastMousePos) {
      let worldPos = canvasTransform.current.screenToWorld(canvasState.lastMousePos);
      if (canvasState.snapToGrid) {
        worldPos = GridUtils.snapToGrid(worldPos, canvasState.gridSize);
      }

      const coordText = `${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}`;
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, ctx.measureText(coordText).width + 10, 20);
      ctx.fillStyle = 'white';
      ctx.font = '12px monospace';
      ctx.fillText(coordText, 15, 20);
      ctx.restore();
    }
  }, [canvasState]);

  // Mouse event handlers
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!if (!canvas) return;) return undefined;

    const mousePos = MouseUtils.getMousePosition(event.nativeEvent, canvas);
    const worldPos = canvasTransform.current.screenToWorld(mousePos);
    const snappedPos = canvasState.snapToGrid ? 
      GridUtils.snapToGrid(worldPos, canvasState.gridSize) : worldPos;

    if (event.button === 0) { // Left click
      // Check for pin click (for wiring)
      const pinAtPos = wiringSystem.current.findPinAt(worldPos, canvasState.components);
      
      if (pinAtPos && !canvasState.isWiring) {
        // Start wiring
        wiringSystem.current.startWire(pinAtPos);
        setCanvasState(prev => ({ ...prev, isWiring: true }));
        return;
      }

      if (pinAtPos && canvasState.isWiring) {
        // Complete wiring
        wiringSystem.current.completeWire(pinAtPos);
        return;
      }

      // Check for component selection
      const clickedComponent = canvasState.components.find(component => {
        const visual = ComponentVisualFactory.getVisual(component.type);
        return visual?.hitTest(worldPos, component);
      });

      if (clickedComponent) {
        // Handle component selection
        if (event.metaKey || event.ctrlKey) {
          // Multi-select
          const newSelected = canvasState.selectedItems.includes(clickedComponent.id)
            ? canvasState.selectedItems.filter(id => id !== clickedComponent.id)
            : [...canvasState.selectedItems, clickedComponent.id];
          
          setCanvasState(prev => ({ ...prev, selectedItems: newSelected }));
        } else {
          // Single select
          setCanvasState(prev => ({ ...prev, selectedItems: [clickedComponent.id] }));
        }
      } else {
        // Clear selection if not multi-selecting
        if (!(event.metaKey || event.ctrlKey)) {
          setCanvasState(prev => ({ ...prev, selectedItems: [] }));
        }
      }

      onCanvasClick?.(snappedPos);
      
      setCanvasState(prev => ({
        ...prev,
        isDragging: true,
        lastMousePos: mousePos
      }));
    } else if (event.button === 2) { // Right click
      // Cancel wiring or show context menu
      if (canvasState.isWiring) {
        wiringSystem.current.cancelWire();
        setCanvasState(prev => ({ ...prev, isWiring: false }));
      }
    }
  }, [canvasState, onCanvasClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!if (!canvas) return;) return undefined;

    const mousePos = MouseUtils.getMousePosition(event.nativeEvent, canvas);
    const worldPos = canvasTransform.current.screenToWorld(mousePos);

    // Update wire preview if wiring
    if (canvasState.isWiring) {
      wiringSystem.current.updateWirePreview(worldPos, canvasState.components);
    }

    if (canvasState.isDragging && canvasState.lastMousePos && !canvasState.isWiring) {
      const delta = {
        x: mousePos.x - canvasState.lastMousePos.x,
        y: mousePos.y - canvasState.lastMousePos.y
      };

      // Pan the canvas
      setCanvasState(prev => ({
        ...prev,
        viewTransform: {
          ...prev.viewTransform,
          x: prev.viewTransform.x + delta.x,
          y: prev.viewTransform.y + delta.y
        },
        lastMousePos: mousePos
      }));
    } else {
      setCanvasState(prev => ({
        ...prev,
        lastMousePos: mousePos
      }));
    }
  }, [canvasState]);

  const handleMouseUp = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      isDragging: false,
      lastMousePos: null
    }));
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if ((event.metaKey || event.ctrlKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        handleRedo();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        // Delete selected items
        handleDeleteSelected();
      } else if (event.key === 'Escape') {
        // Cancel current operation
        if (canvasState.isWiring) {
          wiringSystem.current.cancelWire();
          setCanvasState(prev => ({ ...prev, isWiring: false }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [canvasState, history, historyIndex]);

  function handleDeleteSelected(): void {
    const selectedComponents = canvasState.components.filter(c => canvasState.selectedItems.includes(c.id));
    const selectedWires = canvasState.wires.filter(w => canvasState.selectedItems.includes(w.id));

    if (selectedComponents.length > 0 || selectedWires.length > 0) {
      setCanvasState(prev => ({
        ...prev,
        components: prev.components.filter(c => !prev.selectedItems.includes(c.id)),
        wires: prev.wires.filter(w => !prev.selectedItems.includes(w.id)),
        selectedItems: []
      }));

      selectedComponents.forEach(comp => {
        addToHistory('delete_component', { component: comp });
        onComponentDelete?.(comp.id);
      });

      selectedWires.forEach(wire => {
        addToHistory('delete_wire', { wire });
        onWireDelete?.(wire.id);
      });
    }
  }

  // Canvas control handlers
  const handleZoomIn = () => {
    setCanvasState(prev => ({
      ...prev,
      viewTransform: {
        ...prev.viewTransform,
        scale: Math.min(5, prev.viewTransform.scale * 1.25)
      }
    }));
  };

  const handleZoomOut = () => {
    setCanvasState(prev => ({
      ...prev,
      viewTransform: {
        ...prev.viewTransform,
        scale: Math.max(0.1, prev.viewTransform.scale * 0.8)
      }
    }));
  };

  const handleResetView = () => {
    setCanvasState(prev => ({
      ...prev,
      viewTransform: { x: 0, y: 0, scale: 1 }
    }));
  };

  const handleToggleGrid = () => {
    setCanvasState(prev => ({ ...prev, gridVisible: !prev.gridVisible }));
  };

  const handleToggleSnap = () => {
    setCanvasState(prev => ({ ...prev, snapToGrid: !prev.snapToGrid }));
  };

  // Set up canvas drop zone
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!if (!canvas) return;) return undefined;

    dragDropHandler.current.setupCanvasDropZone(canvas, (componentType, position) => {
      handleComponentDrop(componentType, position);
    });
  }, []);

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

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    };

    resizeCanvas();
    
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(canvasState.selectedItems);
  }, [canvasState.selectedItems, onSelectionChange]);

  // Update component selected state for visual feedback
  useEffect(() => {
    setCanvasState(prev => ({
      ...prev,
      components: prev.components.map(comp => ({
        ...comp,
        selected: prev.selectedItems.includes(comp.id)
      }))
    }));
  }, [canvasState.selectedItems]);

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
          cursor: canvasState.isDragging ? 'grabbing' : 
                  canvasState.isWiring ? 'crosshair' : 'grab'
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
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
          <Tooltip title="Undo (Cmd/Ctrl+Z)" placement="left">
            <IconButton 
              onClick={handleUndo} 
              size="small"
              disabled={historyIndex < 0}
            >
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Redo (Cmd/Ctrl+Y)" placement="left">
            <IconButton 
              onClick={handleRedo} 
              size="small"
              disabled={historyIndex >= history.length - 1}
            >
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete Selected (Del)" placement="left">
            <IconButton 
              onClick={handleDeleteSelected} 
              size="small"
              disabled={canvasState.selectedItems.length === 0}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
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
          
          <Tooltip title="Reset View" placement="left">
            <IconButton onClick={handleResetView} size="small">
              <CenterIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={canvasState.gridVisible ? "Hide Grid" : "Show Grid"} placement="left">
            <IconButton onClick={handleToggleGrid} size="small">
              {canvasState.gridVisible ? <GridOnIcon fontSize="small" /> : <GridOffIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={canvasState.snapToGrid ? "Disable Snap to Grid" : "Enable Snap to Grid"} placement="left">
            <IconButton 
              onClick={handleToggleSnap} 
              size="small"
              sx={{ 
                color: canvasState.snapToGrid ? '#3b82f6' : 'inherit',
                backgroundColor: canvasState.snapToGrid ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
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

// Helper functions
function getDefaultProperties(componentType: string): { [key: string]: any } {
  switch (componentType) {
    case 'arduino-uno':
      return { powerOn: false, pin13: false };
    case 'led':
      return { color: 'red', isOn: false, brightness: 1.0 };
    case 'resistor':
      return { value: '220', unit: 'Ω' };
    case 'button':
      return { isPressed: false };
    default:
      return {};
  }
}

function getDefaultPins(componentType: string): any[] {
  switch (componentType) {
    case 'arduino-uno':
      return [
        { name: 'D0', position: { x: 40, y: -20 }, type: 'input' },
        { name: 'D1', position: { x: 40, y: -15 }, type: 'input' },
        { name: 'D13', position: { x: 40, y: 20 }, type: 'output' },
        { name: 'GND', position: { x: -40, y: 20 }, type: 'ground' },
        { name: '5V', position: { x: -40, y: -20 }, type: 'power' }
      ];
    case 'led':
      return [
        { name: 'anode', position: { x: -3, y: 27 }, type: 'input' },
        { name: 'cathode', position: { x: 3, y: 22 }, type: 'input' }
      ];
    case 'resistor':
      return [
        { name: 'pin1', position: { x: -30, y: 0 }, type: 'input' },
        { name: 'pin2', position: { x: 30, y: 0 }, type: 'input' }
      ];
    case 'button':
      return [
        { name: 'pin1', position: { x: -18, y: -5 }, type: 'input' },
        { name: 'pin2', position: { x: -18, y: 5 }, type: 'input' },
        { name: 'pin3', position: { x: 18, y: -5 }, type: 'input' },
        { name: 'pin4', position: { x: 18, y: 5 }, type: 'input' }
      ];
    default:
      return [];
  }
}

export default IntegratedCircuitCanvas;