/**
 * Serial Monitor Component
 * Provides a UI for monitoring and interacting with Arduino serial communication
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VirtualSerialPort } from '../../simulation/virtual-port/VirtualSerialPort';
import './SerialMonitor.css';

interface SerialMonitorProps {
  port?: VirtualSerialPort;
  onPortChange?: (port: VirtualSerialPort | undefined) => void;
  className?: string;
}

interface SerialMessage {
  id: string;
  timestamp: number;
  direction: 'in' | 'out';
  data: string;
  raw: boolean;
}

const BAUD_RATES = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200, 230400];
const LINE_ENDINGS = [
  { value: '', label: 'No line ending' },
  { value: '\\n', label: 'Newline' },
  { value: '\\r', label: 'Carriage return' },
  { value: '\\r\\n', label: 'Both NL & CR' },
];

export const SerialMonitor: React.FC<SerialMonitorProps> = ({ 
  port, 
  className = '' 
}) => {
  const [messages, setMessages] = useState<SerialMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [lineEnding, setLineEnding] = useState('\\r\\n');
  const [autoscroll, setAutoscroll] = useState(true);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle port connection state
  useEffect(() => {
    if (!port) {
      setIsConnected(false);
      return;
    }

    setIsConnected(port.isPortOpen);

    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);
    
    port.addEventListener('open', handleOpen);
    port.addEventListener('close', handleClose);

    return () => {
      port.removeEventListener('open', handleOpen);
      port.removeEventListener('close', handleClose);
    };
  }, [port]);

  // Handle incoming serial data
  useEffect(() => {
    if (!port) return;

    const handleData = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { data, direction, timestamp } = customEvent.detail;
      
      const message: SerialMessage = {
        id: `${timestamp}-${Math.random()}`,
        timestamp,
        direction,
        data: data.toString('utf8'),
        raw: false
      };

      setMessages(prev => [...prev, message]);
    };

    port.addEventListener('data', handleData);
    return () => port.removeEventListener('data', handleData);
  }, [port]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoscroll && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, autoscroll]);

  const handleConnect = useCallback(async () => {
    if (!port) return;

    try {
      if (isConnected) {
        await port.close();
      } else {
        await port.updateConfig({ baudRate });
        await port.open();
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  }, [port, isConnected, baudRate]);

  const handleSendMessage = useCallback(async () => {
    if (!port || !isConnected || !inputValue.trim()) return;

    try {
      const message = inputValue + lineEnding.replace('\\\\n', '\\n').replace('\\\\r', '\\r');
      await port.write(message);
      
      // Add sent message to display
      const sentMessage: SerialMessage = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        direction: 'in',
        data: message,
        raw: false
      };
      
      setMessages(prev => [...prev, sentMessage]);
      setInputValue('');
      
      // Focus back to input
      inputRef.current?.focus();
    } catch (error) {
      console.error('Send error:', error);
    }
  }, [port, isConnected, inputValue, lineEnding]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleClear = useCallback(() => {
    setIsClearing(true);
    setMessages([]);
    setTimeout(() => setIsClearing(false), 200);
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('en-US', { hour12: false });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  }, []);

  const formatMessage = useCallback((message: SerialMessage) => {
    if (showRaw) {
      return Array.from(Buffer.from(message.data, 'utf8'))
        .map(byte => `0x${byte.toString(16).padStart(2, '0')}`)
        .join(' ');
    }
    return message.data;
  }, [showRaw]);

  return (
    <div className={`serial-monitor ${className}`}>
      {/* Header */}
      <div className="serial-monitor__header">
        <div className="serial-monitor__title">
          <span className="serial-monitor__icon">📺</span>
          Serial Monitor
          {port && (
            <span className="serial-monitor__port">({port.path})</span>
          )}
        </div>
        
        <div className="serial-monitor__controls">
          <select
            className="serial-monitor__select"
            value={baudRate}
            onChange={(e) => setBaudRate(Number(e.target.value))}
            disabled={isConnected}
          >
            {BAUD_RATES.map(rate => (
              <option key={rate} value={rate}>{rate} baud</option>
            ))}
          </select>

          <select
            className="serial-monitor__select"
            value={lineEnding}
            onChange={(e) => setLineEnding(e.target.value)}
          >
            {LINE_ENDINGS.map(ending => (
              <option key={ending.value} value={ending.value}>
                {ending.label}
              </option>
            ))}
          </select>

          <button
            className={`serial-monitor__connect ${isConnected ? 'connected' : ''}`}
            onClick={handleConnect}
            disabled={!port}
          >
            {isConnected ? '🔗 Disconnect' : '🔌 Connect'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesRef}
        className={`serial-monitor__messages ${isClearing ? 'clearing' : ''}`}
      >
        {messages.length === 0 ? (
          <div className="serial-monitor__empty">
            {isConnected ? 'Waiting for data...' : 'Connect to start monitoring'}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`serial-monitor__message serial-monitor__message--${message.direction}`}
            >
              {showTimestamps && (
                <span className="serial-monitor__timestamp">
                  {formatTimestamp(message.timestamp)}
                </span>
              )}
              <span className="serial-monitor__direction">
                {message.direction === 'in' ? '→' : '←'}
              </span>
              <span className="serial-monitor__data">
                {formatMessage(message)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="serial-monitor__input-area">
        <input
          ref={inputRef}
          type="text"
          className="serial-monitor__input"
          placeholder={isConnected ? "Type message and press Enter..." : "Connect to send messages"}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={!isConnected}
        />
        <button
          className="serial-monitor__send"
          onClick={handleSendMessage}
          disabled={!isConnected || !inputValue.trim()}
        >
          Send
        </button>
      </div>

      {/* Footer */}
      <div className="serial-monitor__footer">
        <div className="serial-monitor__options">
          <label className="serial-monitor__checkbox">
            <input
              type="checkbox"
              checked={autoscroll}
              onChange={(e) => setAutoscroll(e.target.checked)}
            />
            Auto-scroll
          </label>
          
          <label className="serial-monitor__checkbox">
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
            />
            Timestamps
          </label>
          
          <label className="serial-monitor__checkbox">
            <input
              type="checkbox"
              checked={showRaw}
              onChange={(e) => setShowRaw(e.target.checked)}
            />
            Raw bytes
          </label>
        </div>

        <div className="serial-monitor__stats">
          {port && isConnected && (
            <>
              <span>Baud: {baudRate}</span>
              <span>Messages: {messages.length}</span>
            </>
          )}
          <button
            className="serial-monitor__clear"
            onClick={handleClear}
            disabled={messages.length === 0}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};