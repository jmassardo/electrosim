import React from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workspace-tabpanel-${index}`}
      aria-labelledby={`workspace-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MainWorkspace: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!currentProject) {
    return null;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Project Header */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h5" component="h1">
          {currentProject.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {currentProject.metadata.description}
        </Typography>
      </Paper>

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Circuit Design" />
          <Tab label="Code Editor" />
          <Tab label="Serial Monitor" />
          <Tab label="Settings" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ 
          height: 400, 
          border: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <Typography color="text.secondary">
            Circuit canvas will be implemented here
          </Typography>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            Arduino Code Editor
          </Typography>
          <Box sx={{ 
            backgroundColor: '#f8f8f8', 
            p: 2, 
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            border: 1,
            borderColor: 'divider'
          }}>
            {currentProject.sketch.code}
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 2, minHeight: 400 }}>
          <Typography variant="h6" gutterBottom>
            Serial Monitor
          </Typography>
          <Box sx={{ 
            backgroundColor: '#000', 
            color: '#00ff00', 
            p: 2, 
            fontFamily: 'monospace',
            fontSize: '14px',
            minHeight: 300
          }}>
            <Typography component="div" sx={{ color: 'inherit' }}>
              Serial Monitor - Ready to connect...
            </Typography>
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Project Settings
          </Typography>
          <Typography variant="body2" paragraph>
            Board: {currentProject.circuit.board.name}
          </Typography>
          <Typography variant="body2" paragraph>
            Created: {new Date(currentProject.metadata.created).toLocaleString()}
          </Typography>
          <Typography variant="body2" paragraph>
            Modified: {new Date(currentProject.metadata.modified).toLocaleString()}
          </Typography>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default MainWorkspace;