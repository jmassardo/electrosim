import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div>
        <h1>🎉 ElectroSim Works!</h1>
        <p>The loading screen issue is fixed!</p>
        <p>Global object available: {typeof globalThis !== 'undefined' ? '✅' : '❌'}</p>
        <p>Process object available: {typeof process !== 'undefined' ? '✅' : '❌'}</p>
      </div>
    </div>
  );
};

export default TestApp;