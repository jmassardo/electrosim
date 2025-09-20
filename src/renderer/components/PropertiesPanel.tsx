import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibleIcon,
  VisibilityOff as HiddenIcon
} from '@mui/icons-material';

interface ComponentProperty {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'slider' | 'color';
  value: any;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

interface SelectedComponent {
  id: string;
  name: string;
  type: string;
  properties: ComponentProperty[];
}

const MOCK_SELECTED_COMPONENT: SelectedComponent = {
  id: 'led-1',
  name: 'LED (Red)',
  type: 'LED',
  properties: [
    {
      key: 'name',
      label: 'Component Name',
      type: 'text',
      value: 'LED1'
    },
    {
      key: 'color',
      label: 'LED Color',
      type: 'select',
      value: 'red',
      options: ['red', 'green', 'blue', 'yellow', 'white']
    },
    {
      key: 'brightness',
      label: 'Brightness',
      type: 'slider',
      value: 75,
      min: 0,
      max: 100,
      step: 5,
      unit: '%'
    },
    {
      key: 'resistance',
      label: 'Forward Resistance',
      type: 'number',
      value: 220,
      unit: 'Ω'
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      value: true
    }
  ]
};

const PropertiesPanel: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = React.useState<SelectedComponent | null>(
    MOCK_SELECTED_COMPONENT
  );
  const [isVisible, setIsVisible] = React.useState(true);

  const handlePropertyChange = (propertyKey: string, value: any) => {
    if (!selectedComponent) return;
    
    setSelectedComponent({
      ...selectedComponent,
      properties: selectedComponent.properties.map(prop =>
        prop.key === propertyKey ? { ...prop, value } : prop
      )
    });
  };

  const handleDeleteComponent = () => {
    // TODO: Implement delete component logic
    console.log('Delete component:', selectedComponent?.id);
    setSelectedComponent(null);
  };

  const handleDuplicateComponent = () => {
    // TODO: Implement duplicate component logic
    console.log('Duplicate component:', selectedComponent?.id);
  };

  const renderPropertyInput = (property: ComponentProperty) => {
    switch (property.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            size="small"
            value={property.value}
            onChange={(e) => handlePropertyChange(property.key, e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white'
              }
            }}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            value={property.value}
            onChange={(e) => handlePropertyChange(property.key, Number(e.target.value))}
            InputProps={{
              endAdornment: property.unit && (
                <Typography variant="caption" sx={{ color: '#64748b', ml: 1 }}>
                  {property.unit}
                </Typography>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white'
              }
            }}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth size="small">
            <Select
              value={property.value}
              onChange={(e) => handlePropertyChange(property.key, e.target.value)}
              sx={{
                backgroundColor: 'white'
              }}
            >
              {property.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={property.value}
                onChange={(e) => handlePropertyChange(property.key, e.target.checked)}
                size="small"
              />
            }
            label=""
            sx={{ m: 0 }}
          />
        );

      case 'slider':
        return (
          <Box>
            <Slider
              value={property.value}
              onChange={(_e, value) => handlePropertyChange(property.key, value)}
              min={property.min ?? 0}
              max={property.max ?? 100}
              step={property.step ?? 1}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}${property.unit || ''}`}
              sx={{
                color: '#60a5fa',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#60a5fa'
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#60a5fa'
                }
              }}
            />
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              mt: 1
            }}>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {property.min}{property.unit}
              </Typography>
              <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500 }}>
                {property.value}{property.unit}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {property.max}{property.unit}
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (!selectedComponent) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#f8fafc'
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: 'white'
        }}>
          <Typography variant="h6" sx={{ color: '#334155', fontSize: '1rem', fontWeight: 600 }}>
            Properties
          </Typography>
        </Box>
        
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          p: 3
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <SettingsIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              No component selected
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              Click on a component in the canvas to edit its properties
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ color: '#334155', fontSize: '1rem', fontWeight: 600 }}>
            Properties
          </Typography>
          <IconButton
            size="small"
            onClick={() => setIsVisible(!isVisible)}
            sx={{ color: '#64748b' }}
          >
            {isVisible ? <VisibleIcon /> : <HiddenIcon />}
          </IconButton>
        </Box>
      </Box>

      {/* Component Info */}
      <Card sx={{ m: 2, elevation: 0, border: '1px solid #e2e8f0' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                {selectedComponent.name}
              </Typography>
              <Chip 
                label={selectedComponent.type}
                size="small"
                sx={{ 
                  backgroundColor: '#e0f2fe', 
                  color: '#0277bd',
                  fontSize: '0.75rem',
                  height: 20
                }}
              />
            </Box>
            <Box>
              <IconButton size="small" onClick={handleDuplicateComponent} sx={{ color: '#64748b' }}>
                <CopyIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleDeleteComponent} sx={{ color: '#dc2626' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Properties */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2 }}>
        {selectedComponent.properties.map((property, index) => (
          <Box key={property.key} sx={{ mb: 3 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#374151', 
                fontWeight: 500,
                mb: 1,
                fontSize: '0.875rem'
              }}
            >
              {property.label}
            </Typography>
            {renderPropertyInput(property)}
            
            {index < selectedComponent.properties.length - 1 && (
              <Divider sx={{ mt: 2, borderColor: '#f1f5f9' }} />
            )}
          </Box>
        ))}
      </Box>

      {/* Actions */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: '#f1f5f9',
        borderTop: '1px solid #e2e8f0'
      }}>
        <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>
          💡 Changes are applied automatically
        </Typography>
      </Box>
    </Box>
  );
};

export default PropertiesPanel;