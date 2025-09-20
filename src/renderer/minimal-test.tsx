import React from 'react';
import ReactDOM from 'react-dom/client';

const MinimalTest: React.FC = () => {
  console.log('MinimalTest component rendering...');
  console.log('typeof global in React:', typeof global);
  
  return (
    <div>
      <h2>Minimal React Test</h2>
      <p>Global type: {typeof global}</p>
      <p>Process type: {typeof process}</p>
      <p>Check console for detailed logs</p>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<MinimalTest />);