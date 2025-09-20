import React, { useState } from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Grid,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Memory as ArduinoIcon,
  LightbulbOutlined as LedIcon,
  ToggleOn as SwitchIcon,
  Sensors as SensorIcon,
  DisplaySettings as DisplayIcon,
  ElectricBolt as ResistorIcon,
  BatteryFull as PowerIcon
} from '@mui/icons-material';

interface ComponentItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}

const MOCK_COMPONENTS: ComponentItem[] = [
  // Arduino Boards
  {
    id: 'arduino-uno',
    name: 'Arduino Uno',
    description: 'ATmega328P microcontroller board',
    icon: <ArduinoIcon sx={{ color: '#00979d' }} />,
    category: 'Arduino Boards'
  },
  {
    id: 'arduino-nano',
    name: 'Arduino Nano',
    description: 'Compact ATmega328P board',
    icon: <ArduinoIcon sx={{ color: '#00979d' }} />,
    category: 'Arduino Boards'
  },
  
  // Basic Components
  {
    id: 'led-red',
    name: 'LED (Red)',
    description: 'Red light emitting diode',
    icon: <LedIcon sx={{ color: '#ef4444' }} />,
    category: 'Basic Components'
  },
  {
    id: 'led-green',
    name: 'LED (Green)',
    description: 'Green light emitting diode',
    icon: <LedIcon sx={{ color: '#10b981' }} />,
    category: 'Basic Components'
  },
  {
    id: 'resistor-220',
    name: '220Ω Resistor',
    description: 'Current limiting resistor',
    icon: <ResistorIcon sx={{ color: '#f59e0b' }} />,
    category: 'Basic Components'
  },
  {
    id: 'button',
    name: 'Push Button',
    description: 'Momentary push button switch',
    icon: <SwitchIcon sx={{ color: '#64748b' }} />,
    category: 'Basic Components'
  },
  
  // Sensors
  {
    id: 'temp-sensor',
    name: 'Temperature Sensor',
    description: 'DHT22 temperature/humidity sensor',
    icon: <SensorIcon sx={{ color: '#06b6d4' }} />,
    category: 'Sensors'
  },
  {
    id: 'light-sensor',
    name: 'Light Sensor',
    description: 'Photoresistor (LDR)',
    icon: <SensorIcon sx={{ color: '#fbbf24' }} />,
    category: 'Sensors'
  },
  
  // Displays
  {
    id: 'lcd-16x2',
    name: '16x2 LCD',
    description: 'Character LCD display',
    icon: <DisplayIcon sx={{ color: '#8b5cf6' }} />,
    category: 'Displays'
  },
  
  // Power
  {
    id: 'battery-9v',
    name: '9V Battery',
    description: 'DC power source',
    icon: <PowerIcon sx={{ color: '#374151' }} />,
    category: 'Power'
  }
];

const CATEGORIES = [
  'Arduino Boards',
  'Basic Components', 
  'Sensors',
  'Displays',
  'Power'
];

const ComponentPalette: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string>('Arduino Boards');

  const filteredComponents = MOCK_COMPONENTS.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    component.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryChange = (category: string) => (
    _event: React.SyntheticEvent,
    isExpanded: boolean
  ) => {
    setExpandedCategory(isExpanded ? category : '');
  };

  const handleComponentDrag = (component: ComponentItem) => {
    // TODO: Implement drag start logic
    console.log('Dragging component:', component.name);
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      {/* Search */}
      <Box sx={{ p: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search components..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#64748b' }} />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
              '& fieldset': {
                borderColor: '#e2e8f0'
              },
              '&:hover fieldset': {
                borderColor: '#cbd5e1'
              }
            }
          }}
        />
      </Box>

      {/* Component Categories */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {CATEGORIES.map((category) => {
          const categoryComponents = filteredComponents.filter(
            component => component.category === category
          );
          
          if (categoryComponents.length === 0 && searchTerm) {
            return null;
          }

          return (
            <Accordion
              key={category}
              expanded={expandedCategory === category}
              onChange={handleCategoryChange(category)}
              elevation={0}
              sx={{
                backgroundColor: 'transparent',
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': {
                  minHeight: 48,
                  '& .MuiAccordionSummary-content': {
                    margin: '12px 0'
                  }
                }
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: expandedCategory === category ? '#e2e8f0' : 'transparent',
                  '&:hover': {
                    backgroundColor: '#f1f5f9'
                  }
                }}
              >
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {category}
                  <Chip 
                    label={categoryComponents.length}
                    size="small"
                    sx={{ 
                      height: 20, 
                      fontSize: '0.75rem',
                      backgroundColor: '#e2e8f0',
                      color: '#64748b'
                    }}
                  />
                </Typography>
              </AccordionSummary>
              
              <AccordionDetails sx={{ pt: 0 }}>
                <Grid container spacing={1}>
                  {categoryComponents.map((component) => (
                    <Grid item xs={12} key={component.id}>
                      <Card
                        sx={{
                          cursor: 'grab',
                          transition: 'all 0.2s',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 2,
                            backgroundColor: '#f1f5f9'
                          },
                          '&:active': {
                            cursor: 'grabbing',
                            transform: 'translateY(0)',
                            boxShadow: 1
                          }
                        }}
                        onClick={() => handleComponentDrag(component)}
                      >
                        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1 
                          }}>
                            {component.icon}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 500,
                                  color: '#1e293b',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {component.name}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: '#64748b',
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {component.description}
                              </Typography>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Tips */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: '#e0f2fe',
        borderTop: '1px solid #b3e5fc'
      }}>
        <Typography variant="caption" sx={{ color: '#01579b', fontWeight: 500 }}>
          💡 Tip: Drag components to the canvas to start building your circuit
        </Typography>
      </Box>
    </Box>
  );
};

export default ComponentPalette;