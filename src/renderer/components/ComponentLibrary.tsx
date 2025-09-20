import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Chip,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Memory as ArduinoIcon,
  Lightbulb as LEDIcon,
  LinearScale as ResistorIcon,
  Battery20 as CapacitorIcon,
  TouchApp as ButtonIcon,
  Settings as ServoIcon,
  Sensors as SensorIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface ComponentDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  properties: Record<string, any>;
  pins: { name: string; type: string; direction: string }[];
  color: string;
}

interface ComponentCategory {
  name: string;
  icon: React.ReactNode;
  components: ComponentDefinition[];
  defaultExpanded: boolean;
}

const componentLibrary: ComponentCategory[] = [
  {
    name: 'Microcontrollers',
    icon: <ArduinoIcon />,
    defaultExpanded: true,
    components: [
      {
        id: 'arduino_uno',
        name: 'Arduino Uno',
        description: 'Arduino Uno R3 development board with ATmega328P',
        icon: <ArduinoIcon sx={{ color: '#00979D' }} />,
        category: 'Microcontrollers',
        properties: {
          microcontroller: 'ATmega328P',
          digitalPins: 14,
          analogPins: 6,
          clockSpeed: '16MHz',
          voltage: '5V'
        },
        pins: [
          { name: 'D0-D13', type: 'digital', direction: 'bidirectional' },
          { name: 'A0-A5', type: 'analog', direction: 'input' },
          { name: '5V, 3.3V, GND', type: 'power', direction: 'output' }
        ],
        color: '#00979D'
      }
    ]
  },
  {
    name: 'Output Components',
    icon: <LEDIcon />,
    defaultExpanded: true,
    components: [
      {
        id: 'led_red',
        name: 'LED (Red)',
        description: 'Red LED - 2.0V forward voltage, 20mA',
        icon: <LEDIcon sx={{ color: '#ff4444' }} />,
        category: 'Output Components',
        properties: {
          color: 'red',
          forwardVoltage: '2.0V',
          current: '20mA',
          brightness: 'Variable'
        },
        pins: [
          { name: 'Anode', type: 'digital', direction: 'input' },
          { name: 'Cathode', type: 'digital', direction: 'input' }
        ],
        color: '#ff4444'
      },
      {
        id: 'led_green',
        name: 'LED (Green)',
        description: 'Green LED - 2.1V forward voltage, 20mA',
        icon: <LEDIcon sx={{ color: '#44ff44' }} />,
        category: 'Output Components',
        properties: {
          color: 'green',
          forwardVoltage: '2.1V',
          current: '20mA',
          brightness: 'Variable'
        },
        pins: [
          { name: 'Anode', type: 'digital', direction: 'input' },
          { name: 'Cathode', type: 'digital', direction: 'input' }
        ],
        color: '#44ff44'
      },
      {
        id: 'led_blue',
        name: 'LED (Blue)',
        description: 'Blue LED - 3.2V forward voltage, 20mA',
        icon: <LEDIcon sx={{ color: '#4444ff' }} />,
        category: 'Output Components',
        properties: {
          color: 'blue',
          forwardVoltage: '3.2V',
          current: '20mA',
          brightness: 'Variable'
        },
        pins: [
          { name: 'Anode', type: 'digital', direction: 'input' },
          { name: 'Cathode', type: 'digital', direction: 'input' }
        ],
        color: '#4444ff'
      },
      {
        id: 'servo_motor',
        name: 'Servo Motor',
        description: 'Standard servo motor with 180° range',
        icon: <ServoIcon sx={{ color: '#666' }} />,
        category: 'Output Components',
        properties: {
          angleRange: '0-180°',
          torque: '1.8kg-cm',
          voltage: '4.8-6V',
          controlSignal: 'PWM'
        },
        pins: [
          { name: 'VCC', type: 'power', direction: 'input' },
          { name: 'GND', type: 'ground', direction: 'input' },
          { name: 'PWM', type: 'digital', direction: 'input' }
        ],
        color: '#666'
      }
    ]
  },
  {
    name: 'Passive Components',
    icon: <ResistorIcon />,
    defaultExpanded: false,
    components: [
      {
        id: 'resistor_220',
        name: 'Resistor (220Ω)',
        description: '220Ω resistor, 1/4W, ±5% tolerance',
        icon: <ResistorIcon sx={{ color: '#8B4513' }} />,
        category: 'Passive Components',
        properties: {
          resistance: '220Ω',
          power: '0.25W',
          tolerance: '±5%',
          tempCoeff: '±200ppm/°C'
        },
        pins: [
          { name: 'Pin 1', type: 'analog', direction: 'bidirectional' },
          { name: 'Pin 2', type: 'analog', direction: 'bidirectional' }
        ],
        color: '#8B4513'
      },
      {
        id: 'resistor_1k',
        name: 'Resistor (1kΩ)',
        description: '1kΩ resistor, 1/4W, ±5% tolerance',
        icon: <ResistorIcon sx={{ color: '#8B4513' }} />,
        category: 'Passive Components',
        properties: {
          resistance: '1kΩ',
          power: '0.25W',
          tolerance: '±5%',
          tempCoeff: '±200ppm/°C'
        },
        pins: [
          { name: 'Pin 1', type: 'analog', direction: 'bidirectional' },
          { name: 'Pin 2', type: 'analog', direction: 'bidirectional' }
        ],
        color: '#8B4513'
      },
      {
        id: 'resistor_10k',
        name: 'Resistor (10kΩ)',
        description: '10kΩ resistor, 1/4W, ±5% tolerance',
        icon: <ResistorIcon sx={{ color: '#8B4513' }} />,
        category: 'Passive Components',
        properties: {
          resistance: '10kΩ',
          power: '0.25W',
          tolerance: '±5%',
          tempCoeff: '±200ppm/°C'
        },
        pins: [
          { name: 'Pin 1', type: 'analog', direction: 'bidirectional' },
          { name: 'Pin 2', type: 'analog', direction: 'bidirectional' }
        ],
        color: '#8B4513'
      },
      {
        id: 'capacitor_100uf',
        name: 'Capacitor (100μF)',
        description: 'Electrolytic capacitor, 100μF, 25V',
        icon: <CapacitorIcon sx={{ color: '#4169E1' }} />,
        category: 'Passive Components',
        properties: {
          capacitance: '100μF',
          voltage: '25V',
          type: 'Electrolytic',
          tolerance: '±20%'
        },
        pins: [
          { name: 'Positive', type: 'analog', direction: 'bidirectional' },
          { name: 'Negative', type: 'analog', direction: 'bidirectional' }
        ],
        color: '#4169E1'
      }
    ]
  },
  {
    name: 'Input Components',
    icon: <ButtonIcon />,
    defaultExpanded: false,
    components: [
      {
        id: 'push_button',
        name: 'Push Button',
        description: 'Momentary push button, normally open',
        icon: <ButtonIcon sx={{ color: '#444' }} />,
        category: 'Input Components',
        properties: {
          type: 'Momentary',
          contact: 'Normally Open',
          rating: '50mA @ 12VDC',
          debounce: '50ms'
        },
        pins: [
          { name: 'Pin 1', type: 'digital', direction: 'bidirectional' },
          { name: 'Pin 2', type: 'digital', direction: 'bidirectional' }
        ],
        color: '#444'
      }
    ]
  },
  {
    name: 'Sensors',
    icon: <SensorIcon />,
    defaultExpanded: false,
    components: [
      {
        id: 'temperature_sensor',
        name: 'Temperature Sensor',
        description: 'LM35 temperature sensor, 0-100°C',
        icon: <SensorIcon sx={{ color: '#FF6347' }} />,
        category: 'Sensors',
        properties: {
          type: 'LM35',
          range: '0-100°C',
          accuracy: '±1°C',
          output: '10mV/°C'
        },
        pins: [
          { name: 'VCC', type: 'power', direction: 'input' },
          { name: 'OUT', type: 'analog', direction: 'output' },
          { name: 'GND', type: 'ground', direction: 'input' }
        ],
        color: '#FF6347'
      }
    ]
  }
];

interface ComponentLibraryProps {
  onComponentSelect?: (component: ComponentDefinition) => void;
  onComponentDragStart?: (component: ComponentDefinition, event: React.DragEvent) => void;
  selectedCategory?: string;
  searchQuery?: string;
}

const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  onComponentSelect,
  onComponentDragStart,
  selectedCategory,
  searchQuery = ''
}) => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    componentLibrary.filter(cat => cat.defaultExpanded).map(cat => cat.name)
  );

  const handleCategoryToggle = (categoryName: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(name => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleComponentClick = (component: ComponentDefinition) => {
    onComponentSelect?.(component);
  };

  const handleDragStart = (component: ComponentDefinition, event: React.DragEvent) => {
    event.dataTransfer.setData('application/json', JSON.stringify(component));
    event.dataTransfer.effectAllowed = 'copy';
    onComponentDragStart?.(component, event);
  };

  const filteredLibrary = componentLibrary
    .map(category => ({
      ...category,
      components: category.components.filter(comp =>
        (!selectedCategory || category.name === selectedCategory) &&
        (!searchQuery || 
         comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
         category.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }))
    .filter(category => category.components.length > 0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={1} sx={{ p: 2, mb: 1 }}>
        <Typography variant="h6" gutterBottom>
          Component Library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Drag components to the canvas or click to select
        </Typography>
      </Paper>

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filteredLibrary.map(category => (
          <Accordion
            key={category.name}
            expanded={expandedCategories.includes(category.name)}
            onChange={() => handleCategoryToggle(category.name)}
            elevation={0}
            sx={{ 
              border: '1px solid',
              borderColor: 'divider',
              '&:not(:last-child)': { borderBottom: 0 },
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {category.icon}
                <Typography variant="subtitle2" fontWeight="medium">
                  {category.name}
                </Typography>
                <Chip 
                  label={category.components.length} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ pt: 0 }}>
              <List dense sx={{ py: 0 }}>
                {category.components.map(component => (
                  <ListItem
                    key={component.id}
                    draggable
                    onDragStart={(e) => handleDragStart(component, e)}
                    onClick={() => handleComponentClick(component)}
                    sx={{
                      border: '1px solid transparent',
                      borderRadius: 1,
                      mb: 0.5,
                      cursor: 'grab',
                      '&:hover': {
                        backgroundColor: alpha(component.color, 0.1),
                        borderColor: alpha(component.color, 0.3)
                      },
                      '&:active': {
                        cursor: 'grabbing'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {component.icon}
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight="medium">
                          {component.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {component.description}
                        </Typography>
                      }
                    />
                    
                    <Tooltip title="Add to canvas">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComponentClick(component);
                        }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {filteredLibrary.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No components found matching your criteria
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ComponentLibrary;