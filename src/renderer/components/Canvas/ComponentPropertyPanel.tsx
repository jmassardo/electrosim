/**
 * Dynamic Component Property Panel
 */
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Button
} from '@mui/material';
import { CanvasComponent } from '../Canvas/types';

interface ComponentPropertyPanelProps {
  selectedComponent: CanvasComponent | null;
  onPropertyChange: (property: string, value: any) => void;
  onPositionChange: (position: { x: number; y: number }) => void;
}

const ComponentPropertyPanel: React.FC<ComponentPropertyPanelProps> = ({
  selectedComponent,
  onPropertyChange,
  onPositionChange
}) => {
  const [localProperties, setLocalProperties] = useState<{ [key: string]: any }>({});
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Update local state when selected component changes
  useEffect(() => {
    if (selectedComponent) {
      setLocalProperties({ ...selectedComponent.properties });
      setPosition(selectedComponent.position);
    } else {
      setLocalProperties({});
      setPosition({ x: 0, y: 0 });
    }
  }, [selectedComponent]);

  const handlePropertyChange = (property: string, value: any) => {
    setLocalProperties(prev => ({ ...prev, [property]: value }));
    onPropertyChange(property, value);
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    const newPosition = { ...position, [axis]: value };
    setPosition(newPosition);
    onPositionChange(newPosition);
  };

  if (!selectedComponent) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: '#6b7280' }}>
        <Typography variant="body2">
          Select a component to edit its properties
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {selectedComponent.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Properties
      </Typography>
      
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Position & Transform
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
            <TextField
              label="X Position"
              type="number"
              size="small"
              value={Math.round(position.x)}
              onChange={(e) => handlePositionChange('x', parseFloat(e.target.value) || 0)}
            />
            <TextField
              label="Y Position"
              type="number"
              size="small"
              value={Math.round(position.y)}
              onChange={(e) => handlePositionChange('y', parseFloat(e.target.value) || 0)}
            />
          </Box>

          <TextField
            label="Rotation"
            type="number"
            size="small"
            fullWidth
            value={selectedComponent.rotation}
            onChange={(e) => onPropertyChange('rotation', parseFloat(e.target.value) || 0)}
            InputProps={{ endAdornment: '°' }}
          />
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Component Properties
          </Typography>
          
          {renderComponentSpecificProperties(selectedComponent.type, localProperties, handlePropertyChange)}
        </CardContent>
      </Card>
    </Box>
  );
};

function renderComponentSpecificProperties(
  componentType: string,
  properties: { [key: string]: any },
  onChange: (property: string, value: any) => void
): React.ReactNode {
  switch (componentType) {
    case 'arduino-uno':
      return <ArduinoUnoProperties properties={properties} onChange={onChange} />;
    case 'led':
      return <LEDProperties properties={properties} onChange={onChange} />;
    case 'resistor':
      return <ResistorProperties properties={properties} onChange={onChange} />;
    case 'button':
      return <ButtonProperties properties={properties} onChange={onChange} />;
    default:
      return <GenericProperties properties={properties} onChange={onChange} />;
  }
}

const ArduinoUnoProperties: React.FC<{
  properties: any;
  onChange: (property: string, value: any) => void;
}> = ({ properties, onChange }) => (
  <Box>
    <FormControlLabel
      control={
        <Switch
          checked={properties.powerOn || false}
          onChange={(e) => onChange('powerOn', e.target.checked)}
        />
      }
      label="Power On"
    />
    
    <FormControlLabel
      control={
        <Switch
          checked={properties.pin13 || false}
          onChange={(e) => onChange('pin13', e.target.checked)}
        />
      }
      label="Pin 13 LED"
    />

    <TextField
      label="Board Name"
      fullWidth
      size="small"
      value={properties.name || 'Arduino Uno'}
      onChange={(e) => onChange('name', e.target.value)}
      sx={{ mt: 2 }}
    />
  </Box>
);

const LEDProperties: React.FC<{
  properties: any;
  onChange: (property: string, value: any) => void;
}> = ({ properties, onChange }) => (
  <Box>
    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
      <InputLabel>LED Color</InputLabel>
      <Select
        value={properties.color || 'red'}
        label="LED Color"
        onChange={(e) => onChange('color', e.target.value)}
      >
        <MenuItem value="red">Red</MenuItem>
        <MenuItem value="green">Green</MenuItem>
        <MenuItem value="blue">Blue</MenuItem>
        <MenuItem value="yellow">Yellow</MenuItem>
        <MenuItem value="white">White</MenuItem>
        <MenuItem value="orange">Orange</MenuItem>
      </Select>
    </FormControl>

    <FormControlLabel
      control={
        <Switch
          checked={properties.isOn || false}
          onChange={(e) => onChange('isOn', e.target.checked)}
        />
      }
      label="LED On"
    />

    <Box sx={{ mt: 2 }}>
      <Typography gutterBottom>
        Brightness: {Math.round((properties.brightness || 1) * 100)}%
      </Typography>
      <Slider
        value={properties.brightness || 1}
        min={0}
        max={1}
        step={0.1}
        onChange={(_, value) => onChange('brightness', value)}
        marks={[
          { value: 0, label: '0%' },
          { value: 0.5, label: '50%' },
          { value: 1, label: '100%' }
        ]}
      />
    </Box>
  </Box>
);

const ResistorProperties: React.FC<{
  properties: any;
  onChange: (property: string, value: any) => void;
}> = ({ properties, onChange }) => (
  <Box>
    <TextField
      label="Resistance Value"
      type="number"
      fullWidth
      size="small"
      value={properties.value || 220}
      onChange={(e) => onChange('value', parseFloat(e.target.value) || 0)}
      sx={{ mb: 2 }}
    />

    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
      <InputLabel>Unit</InputLabel>
      <Select
        value={properties.unit || 'Ω'}
        label="Unit"
        onChange={(e) => onChange('unit', e.target.value)}
      >
        <MenuItem value="Ω">Ω (Ohms)</MenuItem>
        <MenuItem value="kΩ">kΩ (Kilo-ohms)</MenuItem>
        <MenuItem value="MΩ">MΩ (Mega-ohms)</MenuItem>
      </Select>
    </FormControl>

    <TextField
      label="Tolerance"
      fullWidth
      size="small"
      value={properties.tolerance || '5%'}
      onChange={(e) => onChange('tolerance', e.target.value)}
    />
  </Box>
);

const ButtonProperties: React.FC<{
  properties: any;
  onChange: (property: string, value: any) => void;
}> = ({ properties, onChange }) => (
  <Box>
    <FormControlLabel
      control={
        <Switch
          checked={properties.isPressed || false}
          onChange={(e) => onChange('isPressed', e.target.checked)}
        />
      }
      label="Button Pressed"
    />

    <FormControl fullWidth size="small" sx={{ mt: 2 }}>
      <InputLabel>Button Type</InputLabel>
      <Select
        value={properties.type || 'momentary'}
        label="Button Type"
        onChange={(e) => onChange('type', e.target.value)}
      >
        <MenuItem value="momentary">Momentary</MenuItem>
        <MenuItem value="toggle">Toggle</MenuItem>
        <MenuItem value="latching">Latching</MenuItem>
      </Select>
    </FormControl>

    <TextField
      label="Button Label"
      fullWidth
      size="small"
      value={properties.label || ''}
      onChange={(e) => onChange('label', e.target.value)}
      sx={{ mt: 2 }}
    />
  </Box>
);

const GenericProperties: React.FC<{
  properties: any;
  onChange: (property: string, value: any) => void;
}> = ({ properties, onChange }) => (
  <Box>
    {Object.entries(properties).map(([key, value]) => (
      <TextField
        key={key}
        label={key.charAt(0).toUpperCase() + key.slice(1)}
        fullWidth
        size="small"
        value={String(value)}
        onChange={(e) => {
          const newValue = typeof value === 'number' ? 
            parseFloat(e.target.value) || 0 : e.target.value;
          onChange(key, newValue);
        }}
        sx={{ mb: 1 }}
      />
    ))}
    
    {Object.keys(properties).length === 0 && (
      <Typography variant="body2" color="textSecondary">
        No properties available for this component
      </Typography>
    )}
  </Box>
);

export default ComponentPropertyPanel;