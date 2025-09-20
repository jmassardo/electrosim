/**
 * 7-Segment Display
 * Simulates single and multi-digit 7-segment displays for Arduino projects
 * Supports common cathode/anode configurations and multiplexing
 */

export interface SevenSegmentConfig {
  digits: number;           // Number of digits (1-8)
  commonType: 'cathode' | 'anode'; // Common cathode or anode
  multiplexed: boolean;     // Whether digits are multiplexed
  refreshRate: number;      // Hz for multiplexed displays
  brightness: number;       // 0-100%
  decimalPoints: boolean;   // Support for decimal points
  characterSet: 'numeric' | 'alphanumeric'; // Character support
  operatingVoltage: { min: number; max: number };
}

export interface SegmentMapping {
  a: boolean;  // Top
  b: boolean;  // Top right
  c: boolean;  // Bottom right
  d: boolean;  // Bottom
  e: boolean;  // Bottom left
  f: boolean;  // Top left
  g: boolean;  // Center
  dp: boolean; // Decimal point
}

export interface DisplayState {
  digits: SegmentMapping[];
  brightness: number;
  blinking: boolean;
  blinkRate: number; // Hz
  currentDigit: number; // For multiplexed displays
  displayValue: string;
}

export class SevenSegmentDisplay {
  private config: SevenSegmentConfig;
  private pins: {
    segments: { a: number; b: number; c: number; d: number; e: number; f: number; g: number; dp?: number };
    digitSelect?: number[]; // For multiplexed displays
    commonPin?: number;     // For single digit displays
  };
  
  private state: DisplayState;
  private isInitialized: boolean = false;
  
  // Character map for 7-segment display
  private characterMap = new Map<string, SegmentMapping>([
    ['0', { a: true, b: true, c: true, d: true, e: true, f: true, g: false, dp: false }],
    ['1', { a: false, b: true, c: true, d: false, e: false, f: false, g: false, dp: false }],
    ['2', { a: true, b: true, c: false, d: true, e: true, f: false, g: true, dp: false }],
    ['3', { a: true, b: true, c: true, d: true, e: false, f: false, g: true, dp: false }],
    ['4', { a: false, b: true, c: true, d: false, e: false, f: true, g: true, dp: false }],
    ['5', { a: true, b: false, c: true, d: true, e: false, f: true, g: true, dp: false }],
    ['6', { a: true, b: false, c: true, d: true, e: true, f: true, g: true, dp: false }],
    ['7', { a: true, b: true, c: true, d: false, e: false, f: false, g: false, dp: false }],
    ['8', { a: true, b: true, c: true, d: true, e: true, f: true, g: true, dp: false }],
    ['9', { a: true, b: true, c: true, d: true, e: false, f: true, g: true, dp: false }],
    // Alphanumeric characters (limited set)
    ['A', { a: true, b: true, c: true, d: false, e: true, f: true, g: true, dp: false }],
    ['B', { a: false, b: false, c: true, d: true, e: true, f: true, g: true, dp: false }], // b
    ['C', { a: true, b: false, c: false, d: true, e: true, f: true, g: false, dp: false }],
    ['D', { a: false, b: true, c: true, d: true, e: true, f: false, g: true, dp: false }], // d
    ['E', { a: true, b: false, c: false, d: true, e: true, f: true, g: true, dp: false }],
    ['F', { a: true, b: false, c: false, d: false, e: true, f: true, g: true, dp: false }],
    ['H', { a: false, b: true, c: true, d: false, e: true, f: true, g: true, dp: false }],
    ['L', { a: false, b: false, c: false, d: true, e: true, f: true, g: false, dp: false }],
    ['O', { a: true, b: true, c: true, d: true, e: true, f: true, g: false, dp: false }],
    ['P', { a: true, b: true, c: false, d: false, e: true, f: true, g: true, dp: false }],
    ['U', { a: false, b: true, c: true, d: true, e: true, f: true, g: false, dp: false }],
    ['-', { a: false, b: false, c: false, d: false, e: false, f: false, g: true, dp: false }],
    [' ', { a: false, b: false, c: false, d: false, e: false, f: false, g: false, dp: false }]
  ]);
  
  // Multiplexing control
  private multiplexTimer?: NodeJS.Timeout;
  private currentMultiplexDigit: number = 0;
  
  // Blinking control
  private blinkTimer?: NodeJS.Timeout;
  private blinkState: boolean = true;
  
  // Callbacks
  private onDisplayUpdateCallback?: (state: DisplayState) => void;
  private onBrightnessChangeCallback?: (brightness: number) => void;

  constructor(
    pins: {
      segments: { a: number; b: number; c: number; d: number; e: number; f: number; g: number; dp?: number };
      digitSelect?: number[];
      commonPin?: number;
    },
    config: Partial<SevenSegmentConfig> = {}
  ) {
    this.pins = pins;
    this.config = {
      digits: pins.digitSelect?.length || 1,
      commonType: 'cathode',
      multiplexed: pins.digitSelect !== undefined,
      refreshRate: 100, // 100Hz for multiplexed displays
      brightness: 75,
      decimalPoints: pins.segments.dp !== undefined,
      characterSet: 'numeric',
      operatingVoltage: { min: 3.0, max: 5.5 },
      ...config
    };

    this.state = {
      digits: Array(this.config.digits).fill(null).map(() => this.getBlankSegment()),
      brightness: this.config.brightness,
      blinking: false,
      blinkRate: 1, // 1Hz
      currentDigit: 0,
      displayValue: ' '.repeat(this.config.digits)
    };
  }

  /**
   * Initialize display
   */
  public begin(voltage: number = 5.0): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.isInitialized = true;
    
    if (this.config.multiplexed) {
      this.startMultiplexing();
    }
    
    this.clear();
    return true;
  }

  /**
   * Display a number
   */
  public displayNumber(number: number, decimalPlaces: number = 0): boolean {
    if (!this.isInitialized) return false;
    
    let numStr = number.toFixed(decimalPlaces);
    
    // Handle negative numbers
    const isNegative = number < 0;
    if (isNegative) {
      numStr = numStr.substring(1); // Remove negative sign
    }
    
    // Check if number fits in display
    const requiredDigits = numStr.replace('.', '').length + (isNegative ? 1 : 0);
    if (requiredDigits > this.config.digits) {
      this.displayError();
      return false;
    }
    
    this.clear();
    
    // Right-align the number
    let digitIndex = this.config.digits - 1;
    let hasDecimalPoint = false;
    
    for (let i = numStr.length - 1; i >= 0 && digitIndex >= 0; i--) {
      const char = numStr[i];
      
      if (char === '.') {
        hasDecimalPoint = true;
        continue;
      }
      
      const segments = this.characterMap.get(char);
      if (segments) {
        this.state.digits[digitIndex] = { ...segments };
        if (hasDecimalPoint && this.config.decimalPoints) {
          this.state.digits[digitIndex].dp = true;
          hasDecimalPoint = false;
        }
      }
      
      digitIndex--;
    }
    
    // Add negative sign if needed
    if (isNegative && digitIndex >= 0) {
      const minusSegments = this.characterMap.get('-');
      if (minusSegments) {
        this.state.digits[digitIndex] = { ...minusSegments };
      }
    }
    
    this.state.displayValue = number.toString();
    this.triggerDisplayUpdate();
    
    return true;
  }

  /**
   * Display text (limited alphanumeric support)
   */
  public displayText(text: string, rightAlign: boolean = false): boolean {
    if (!this.isInitialized) return false;
    
    if (text.length > this.config.digits) {
      return false;
    }
    
    this.clear();
    
    const startIndex = rightAlign ? this.config.digits - text.length : 0;
    
    for (let i = 0; i < text.length && i < this.config.digits; i++) {
      const char = text[i].toUpperCase();
      const segments = this.characterMap.get(char);
      
      if (segments) {
        this.state.digits[startIndex + i] = { ...segments };
      } else {
        // Unknown character, display as blank or error
        this.state.digits[startIndex + i] = this.getBlankSegment();
      }
    }
    
    this.state.displayValue = text;
    this.triggerDisplayUpdate();
    
    return true;
  }

  /**
   * Set individual digit
   */
  public setDigit(digit: number, character: string, decimalPoint: boolean = false): boolean {
    if (!this.isInitialized || digit >= this.config.digits) return false;
    
    const segments = this.characterMap.get(character.toUpperCase());
    if (!segments) return false;
    
    this.state.digits[digit] = { ...segments };
    if (decimalPoint && this.config.decimalPoints) {
      this.state.digits[digit].dp = true;
    }
    
    this.triggerDisplayUpdate();
    return true;
  }

  /**
   * Set custom segment pattern
   */
  public setSegments(digit: number, segments: SegmentMapping): boolean {
    if (!this.isInitialized || digit >= this.config.digits) return false;
    
    this.state.digits[digit] = { ...segments };
    this.triggerDisplayUpdate();
    return true;
  }

  /**
   * Clear display
   */
  public clear(): void {
    if (!this.isInitialized) return;
    
    for (let i = 0; i < this.config.digits; i++) {
      this.state.digits[i] = this.getBlankSegment();
    }
    
    this.state.displayValue = ' '.repeat(this.config.digits);
    this.triggerDisplayUpdate();
  }

  /**
   * Set brightness (0-100%)
   */
  public setBrightness(brightness: number): void {
    this.state.brightness = Math.max(0, Math.min(100, brightness));
    
    if (this.onBrightnessChangeCallback) {
      this.onBrightnessChangeCallback(this.state.brightness);
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Start blinking
   */
  public startBlinking(rate: number = 1): void {
    this.state.blinking = true;
    this.state.blinkRate = rate;
    
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
    }
    
    this.blinkTimer = setInterval(() => {
      this.blinkState = !this.blinkState;
      this.triggerDisplayUpdate();
    }, 500 / rate); // Convert Hz to milliseconds
  }

  /**
   * Stop blinking
   */
  public stopBlinking(): void {
    this.state.blinking = false;
    this.blinkState = true;
    
    if (this.blinkTimer) {
      clearInterval(this.blinkTimer);
      this.blinkTimer = undefined as any;
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Display error pattern
   */
  public displayError(): void {
    this.displayText('ERR');
  }

  /**
   * Count up animation
   */
  public countUp(from: number, to: number, duration: number = 2000): void {
    if (!this.isInitialized) return;
    
    const steps = Math.abs(to - from);
    const stepDuration = duration / steps;
    let current = from;
    
    const animate = () => {
      this.displayNumber(current);
      
      if (current !== to) {
        current += (to > from) ? 1 : -1;
        setTimeout(animate, stepDuration);
      }
    };
    
    animate();
  }

  /**
   * Scrolling text animation
   */
  public scrollText(text: string, speed: number = 200): void {
    if (!this.isInitialized || text.length <= this.config.digits) {
      this.displayText(text);
      return;
    }
    
    let position = 0;
    
    const scroll = () => {
      const visibleText = text.substring(position, position + this.config.digits);
      this.displayText(visibleText);
      
      position++;
      if (position <= text.length - this.config.digits) {
        setTimeout(scroll, speed);
      } else {
        // Reset and start over
        position = 0;
        setTimeout(scroll, speed * 2); // Pause at end
      }
    };
    
    scroll();
  }

  /**
   * Get current display state
   */
  public getState(): DisplayState {
    return {
      ...this.state,
      digits: this.state.digits.map(digit => ({ ...digit }))
    };
  }

  /**
   * Get pins configuration
   */
  public getPins(): typeof this.pins {
    return JSON.parse(JSON.stringify(this.pins));
  }

  /**
   * Get configuration
   */
  public getConfig(): SevenSegmentConfig {
    return { ...this.config };
  }

  /**
   * Check if display is ready
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Set display update callback
   */
  public onDisplayUpdate(callback: (state: DisplayState) => void): void {
    this.onDisplayUpdateCallback = callback;
  }

  /**
   * Set brightness change callback
   */
  public onBrightnessChange(callback: (brightness: number) => void): void {
    this.onBrightnessChangeCallback = callback;
  }

  /**
   * Get power consumption (mA)
   */
  public getPowerConsumption(): number {
    if (!this.isInitialized) return 0;
    
    let consumption = 5; // Base controller consumption
    
    // Add consumption for each active segment
    const segmentCurrent = 20; // mA per segment
    
    for (const digit of this.state.digits) {
      const activeSegments = Object.values(digit).filter(Boolean).length;
      consumption += activeSegments * segmentCurrent * (this.state.brightness / 100);
    }
    
    return consumption;
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopMultiplexing();
    this.stopBlinking();
    this.isInitialized = false;
  }

  /**
   * Get blank segment pattern
   */
  private getBlankSegment(): SegmentMapping {
    return { a: false, b: false, c: false, d: false, e: false, f: false, g: false, dp: false };
  }

  /**
   * Start multiplexing for multi-digit displays
   */
  private startMultiplexing(): void {
    if (!this.config.multiplexed) return;
    
    this.multiplexTimer = setInterval(() => {
      this.currentMultiplexDigit = (this.currentMultiplexDigit + 1) % this.config.digits;
      this.state.currentDigit = this.currentMultiplexDigit;
      // In real implementation, this would control digit select pins
    }, 1000 / this.config.refreshRate);
  }

  /**
   * Stop multiplexing
   */
  private stopMultiplexing(): void {
    if (this.multiplexTimer) {
      clearInterval(this.multiplexTimer);
      this.multiplexTimer = undefined as any;
    }
  }

  /**
   * Trigger display update callback
   */
  private triggerDisplayUpdate(): void {
    if (this.onDisplayUpdateCallback) {
      // Apply blinking effect if enabled
      let currentState = this.getState();
      
      if (this.state.blinking && !this.blinkState) {
        currentState = {
          ...currentState,
          digits: currentState.digits.map(() => this.getBlankSegment())
        };
      }
      
      this.onDisplayUpdateCallback(currentState);
    }
  }

  /**
   * Create common display configurations
   */
  public static createSingleDigit(segments: { a: number; b: number; c: number; d: number; e: number; f: number; g: number; dp?: number }, commonPin: number): SevenSegmentDisplay {
    return new SevenSegmentDisplay({
      segments,
      commonPin
    }, {
      digits: 1,
      multiplexed: false
    });
  }

  /**
   * Create 4-digit multiplexed display
   */
  public static createFourDigit(
    segments: { a: number; b: number; c: number; d: number; e: number; f: number; g: number; dp?: number },
    digitSelect: [number, number, number, number]
  ): SevenSegmentDisplay {
    return new SevenSegmentDisplay({
      segments,
      digitSelect
    }, {
      digits: 4,
      multiplexed: true,
      refreshRate: 100
    });
  }

  /**
   * Get segment names for debugging
   */
  public static getSegmentNames(): string[] {
    return ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
  }

  /**
   * Validate character support
   */
  public canDisplayCharacter(char: string): boolean {
    return this.characterMap.has(char.toUpperCase());
  }

  /**
   * Get supported characters
   */
  public getSupportedCharacters(): string[] {
    return Array.from(this.characterMap.keys());
  }
}