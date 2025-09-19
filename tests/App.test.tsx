import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../src/renderer/App';

// Mock Redux store for testing
jest.mock('../src/renderer/store', () => ({
  store: {
    getState: jest.fn(() => ({})),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  },
}));

describe('App Component', () => {
  it('renders welcome message', () => {
    render(<App />);
    expect(screen.getByText(/Welcome to ElectroLoom/i)).toBeInTheDocument();
  });

  it('renders project action buttons', () => {
    render(<App />);
    expect(screen.getByText(/New Project/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Project/i)).toBeInTheDocument();
  });

  it('displays app title', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /🔌 ElectroLoom/i })).toBeInTheDocument();
  });
});