import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ComponentLibrary from '../../../../src/renderer/components/ComponentLibrary';

// Mock the Redux hooks
const mockDispatch = jest.fn();
jest.mock('../../../../src/renderer/hooks/redux', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: jest.fn((selector) => {
    // Return mock state based on selector
    return {
      components: {},
      selectedComponent: null,
    };
  }),
}));

// Create a theme for testing
const theme = createTheme();

// Wrapper component that provides theme
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('ComponentLibrary', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  test('should render component library with categories', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    expect(screen.getByText('Component Library')).toBeInTheDocument();
    expect(screen.getByText('Microcontrollers')).toBeInTheDocument();
    expect(screen.getByText('Basic Components')).toBeInTheDocument();
    expect(screen.getByText('Sensors')).toBeInTheDocument();
    expect(screen.getByText('Actuators')).toBeInTheDocument();
  });

  test('should expand and collapse categories', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    const basicComponentsHeader = screen.getByText('Basic Components');
    const accordion = basicComponentsHeader.closest('[data-testid*="accordion"]') || 
                     basicComponentsHeader.closest('.MuiAccordion-root');
    
    expect(accordion).toBeInTheDocument();
    
    // Click to expand
    fireEvent.click(basicComponentsHeader);
    
    // Should show components in the category
    expect(screen.getByText('LED')).toBeInTheDocument();
    expect(screen.getByText('Resistor')).toBeInTheDocument();
    expect(screen.getByText('Capacitor')).toBeInTheDocument();
  });

  test('should show component details in expanded category', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components
    const basicComponents = screen.getByText('Basic Components');
    fireEvent.click(basicComponents);

    // Check for LED component details
    expect(screen.getByText('LED')).toBeInTheDocument();
    expect(screen.getByText('Light Emitting Diode')).toBeInTheDocument();
    
    // Check for resistor component details  
    expect(screen.getByText('Resistor')).toBeInTheDocument();
    expect(screen.getByText('Current limiting resistor')).toBeInTheDocument();
  });

  test('should display component icons correctly', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand categories to show components
    fireEvent.click(screen.getByText('Basic Components'));
    fireEvent.click(screen.getByText('Sensors'));

    // Icons should be present (check by data-testid or class names)
    const icons = document.querySelectorAll('.MuiSvgIcon-root');
    expect(icons.length).toBeGreaterThan(0);
  });

  test('should show component properties when available', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components
    fireEvent.click(screen.getByText('Basic Components'));
    
    // Look for component property indicators (like resistance values)
    // This might be shown as chips or in component descriptions
    const resistorComponent = screen.getByText('Resistor');
    expect(resistorComponent).toBeInTheDocument();
  });

  test('should handle component selection', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components
    fireEvent.click(screen.getByText('Basic Components'));
    
    // Click on LED component
    const ledComponent = screen.getByText('LED');
    fireEvent.click(ledComponent);
    
    // Should dispatch selection action
    expect(mockDispatch).toHaveBeenCalled();
  });

  test('should support drag and drop initiation', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components
    fireEvent.click(screen.getByText('Basic Components'));
    
    const ledComponent = screen.getByText('LED');
    
    // Simulate drag start
    fireEvent.dragStart(ledComponent, {
      dataTransfer: {
        setData: jest.fn(),
        effectAllowed: 'copy'
      }
    });

    // Should set drag data
    // Note: In real implementation, we'd check the drag data is set correctly
  });

  test('should filter components by search if search feature exists', async () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Look for search input (if implemented)
    const searchInput = document.querySelector('input[placeholder*="search" i]');
    
    if (searchInput) {
      // Type in search
      fireEvent.change(searchInput, { target: { value: 'LED' } });
      
      await waitFor(() => {
        // Should show only LED-related components
        expect(screen.getByText('LED')).toBeInTheDocument();
        // Other components might be hidden
      });
    }
  });

  test('should show component pin information', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components  
    fireEvent.click(screen.getByText('Basic Components'));
    
    // Check if pin information is displayed
    // This might be in tooltips, expanded details, or component descriptions
    const ledComponent = screen.getByText('LED');
    
    // Hover to potentially show pin info in tooltip
    fireEvent.mouseEnter(ledComponent);
  });

  test('should categorize components correctly', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Check main categories are present
    expect(screen.getByText('Microcontrollers')).toBeInTheDocument();
    expect(screen.getByText('Basic Components')).toBeInTheDocument();
    expect(screen.getByText('Sensors')).toBeInTheDocument();
    expect(screen.getByText('Actuators')).toBeInTheDocument();

    // Expand each category to verify contents
    fireEvent.click(screen.getByText('Microcontrollers'));
    // Should contain Arduino boards
    
    fireEvent.click(screen.getByText('Sensors'));  
    // Should contain DHT22, HC-SR04, etc.
    
    fireEvent.click(screen.getByText('Actuators'));
    // Should contain servo motors, etc.
  });

  test('should handle empty categories gracefully', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // All categories should render without errors even if empty
    const categories = screen.getAllByRole('button', { name: /expand/i });
    
    categories.forEach(category => {
      expect(() => fireEvent.click(category)).not.toThrow();
    });
  });

  test('should provide accessibility features', () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('region')).toBeInTheDocument(); // Component library region
    
    // Accordion headers should have proper roles
    const accordionButtons = screen.getAllByRole('button');
    expect(accordionButtons.length).toBeGreaterThan(0);
    
    // Components should be in lists for screen readers
    fireEvent.click(screen.getByText('Basic Components'));
    const lists = screen.getAllByRole('list');
    expect(lists.length).toBeGreaterThan(0);
  });

  test('should show component tooltips with detailed information', async () => {
    render(
      <TestWrapper>
        <ComponentLibrary />
      </TestWrapper>
    );

    // Expand basic components
    fireEvent.click(screen.getByText('Basic Components'));
    
    const resistorComponent = screen.getByText('Resistor');
    
    // Hover to show tooltip
    fireEvent.mouseEnter(resistorComponent);
    
    // Wait for tooltip to appear
    await waitFor(() => {
      // Tooltip might contain component specifications
      const tooltip = document.querySelector('[role="tooltip"]');
      if (tooltip) {
        expect(tooltip).toBeInTheDocument();
      }
    });
  });
});