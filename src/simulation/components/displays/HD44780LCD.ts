/**
 * HD44780 LCD Display (16x2)
 * Simulates the popular 16x2 character LCD display for Arduino projects
 */

export interface LCDConfig {
  columns: number;      // Characters per row (typically 16 or 20)
  rows: number;         // Number of rows (typically 2 or 4)
  backlight: boolean;   // Backlight support
  contrast: number;     // Contrast level (0-100)
  characterSet: 'A00' | 'A02'; // Character ROM
  operatingVoltage: { min: number; max: number };
  backlightVoltage: number;
}

export interface LCDCharacter {
  char: string;
  customPattern?: number[]; // 8-byte custom character pattern
}

export interface LCDState {
  display: string[][];     // 2D array of characters
  cursorPosition: { row: number; col: number };
  displayOn: boolean;
  cursorOn: boolean;
  blinkOn: boolean;
  backlightOn: boolean;
  scrollDirection: 'left' | 'right';
  entryMode: 'increment' | 'decrement';
  autoScroll: boolean;
}

export class HD44780LCD {
  private config: LCDConfig;
  private pins: {
    rs: number;    // Register Select
    enable: number; // Enable
    d4: number;     // Data bit 4
    d5: number;     // Data bit 5
    d6: number;     // Data bit 6
    d7: number;     // Data bit 7
    backlight?: number; // Backlight control (optional)
  };
  
  private state: LCDState;
  private customCharacters: Map<number, number[]> = new Map();
  private isInitialized: boolean = false;
  
  // Timing simulation
  private lastCommandTime: number = 0;
  private commandDelays = {
    clear: 1520,      // microseconds
    home: 1520,
    write: 37,
    command: 37
  };
  
  // Callbacks
  private onDisplayUpdateCallback?: (state: LCDState) => void;
  private onBacklightChangeCallback?: (on: boolean) => void;

  constructor(
    pins: {
      rs: number;
      enable: number;
      d4: number;
      d5: number;
      d6: number;
      d7: number;
      backlight?: number;
    },
    config: Partial<LCDConfig> = {}
  ) {
    this.pins = pins;
    this.config = {
      columns: 16,
      rows: 2,
      backlight: pins.backlight !== undefined,
      contrast: 50,
      characterSet: 'A00',
      operatingVoltage: { min: 4.5, max: 5.5 },
      backlightVoltage: 3.3,
      ...config
    };

    this.state = {
      display: Array(this.config.rows).fill(null).map(() => Array(this.config.columns).fill(' ')),
      cursorPosition: { row: 0, col: 0 },
      displayOn: false,
      cursorOn: false,
      blinkOn: false,
      backlightOn: false,
      scrollDirection: 'left',
      entryMode: 'increment',
      autoScroll: false
    };
  }

  /**
   * Initialize LCD display
   */
  public begin(columns: number = 16, rows: number = 2, voltage: number = 5.0): boolean {
    if (voltage < this.config.operatingVoltage.min || voltage > this.config.operatingVoltage.max) {
      return false;
    }

    this.config.columns = columns;
    this.config.rows = rows;
    this.isInitialized = true;

    // Reset display state
    this.state.display = Array(rows).fill(null).map(() => Array(columns).fill(' '));
    this.state.cursorPosition = { row: 0, col: 0 };
    this.state.displayOn = true;
    this.state.cursorOn = false;
    this.state.blinkOn = false;

    this.triggerDisplayUpdate();
    return true;
  }

  /**
   * Clear display and return cursor to home
   */
  public clear(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.clear);
    
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.columns; col++) {
        this.state.display[row][col] = ' ';
      }
    }
    
    this.state.cursorPosition = { row: 0, col: 0 };
    this.triggerDisplayUpdate();
  }

  /**
   * Return cursor to home position (0,0)
   */
  public home(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.home);
    this.state.cursorPosition = { row: 0, col: 0 };
    this.triggerDisplayUpdate();
  }

  /**
   * Set cursor position
   */
  public setCursor(col: number, row: number): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    
    // Clamp to valid ranges
    row = Math.max(0, Math.min(this.config.rows - 1, row));
    col = Math.max(0, Math.min(this.config.columns - 1, col));
    
    this.state.cursorPosition = { row, col };
    this.triggerDisplayUpdate();
  }

  /**
   * Turn display on/off
   */
  public display(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.displayOn = true;
    this.triggerDisplayUpdate();
  }

  /**
   * Turn display off
   */
  public noDisplay(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.displayOn = false;
    this.triggerDisplayUpdate();
  }

  /**
   * Turn cursor on
   */
  public cursor(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.cursorOn = true;
    this.triggerDisplayUpdate();
  }

  /**
   * Turn cursor off
   */
  public noCursor(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.cursorOn = false;
    this.triggerDisplayUpdate();
  }

  /**
   * Turn cursor blinking on
   */
  public blink(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.blinkOn = true;
    this.triggerDisplayUpdate();
  }

  /**
   * Turn cursor blinking off
   */
  public noBlink(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.state.blinkOn = false;
    this.triggerDisplayUpdate();
  }

  /**
   * Scroll display left
   */
  public scrollDisplayLeft(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = 0; col < this.config.columns - 1; col++) {
        this.state.display[row][col] = this.state.display[row][col + 1];
      }
      this.state.display[row][this.config.columns - 1] = ' ';
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Scroll display right
   */
  public scrollDisplayRight(): void {
    if (!this.isInitialized) return;
    
    this.waitForCommand(this.commandDelays.command);
    
    for (let row = 0; row < this.config.rows; row++) {
      for (let col = this.config.columns - 1; col > 0; col--) {
        this.state.display[row][col] = this.state.display[row][col - 1];
      }
      this.state.display[row][0] = ' ';
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Write string to current cursor position
   */
  public print(text: string): void {
    if (!this.isInitialized) return;
    
    for (const char of text) {
      this.write(char);
    }
  }

  /**
   * Write string with newline
   */
  public println(text: string = ''): void {
    this.print(text);
    
    // Move to next line
    this.state.cursorPosition.row++;
    this.state.cursorPosition.col = 0;
    
    if (this.state.cursorPosition.row >= this.config.rows) {
      this.state.cursorPosition.row = 0; // Wrap to first row
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Write single character
   */
  public write(char: string): void {
    if (!this.isInitialized || char.length === 0) return;
    
    this.waitForCommand(this.commandDelays.write);
    
    const { row, col } = this.state.cursorPosition;
    
    if (row < this.config.rows && col < this.config.columns) {
      this.state.display[row][col] = char[0];
      
      // Advance cursor
      if (this.state.entryMode === 'increment') {
        this.state.cursorPosition.col++;
        if (this.state.cursorPosition.col >= this.config.columns) {
          if (this.state.autoScroll) {
            this.scrollDisplayLeft();
            this.state.cursorPosition.col = this.config.columns - 1;
          } else {
            this.state.cursorPosition.col = 0;
            this.state.cursorPosition.row = (this.state.cursorPosition.row + 1) % this.config.rows;
          }
        }
      } else {
        this.state.cursorPosition.col--;
        if (this.state.cursorPosition.col < 0) {
          this.state.cursorPosition.col = this.config.columns - 1;
          this.state.cursorPosition.row = this.state.cursorPosition.row > 0 ? 
            this.state.cursorPosition.row - 1 : this.config.rows - 1;
        }
      }
    }
    
    this.triggerDisplayUpdate();
  }

  /**
   * Create custom character
   */
  public createChar(location: number, charmap: number[]): void {
    if (!this.isInitialized || location > 7 || charmap.length !== 8) return;
    
    this.waitForCommand(this.commandDelays.command);
    this.customCharacters.set(location, [...charmap]);
  }

  /**
   * Control backlight (if supported)
   */
  public backlight(): void {
    if (!this.config.backlight) return;
    
    this.state.backlightOn = true;
    if (this.onBacklightChangeCallback) {
      this.onBacklightChangeCallback(true);
    }
  }

  /**
   * Turn off backlight
   */
  public noBacklight(): void {
    if (!this.config.backlight) return;
    
    this.state.backlightOn = false;
    if (this.onBacklightChangeCallback) {
      this.onBacklightChangeCallback(false);
    }
  }

  /**
   * Set entry mode (increment/decrement)
   */
  public leftToRight(): void {
    this.state.entryMode = 'increment';
  }

  /**
   * Set entry mode to right-to-left
   */
  public rightToLeft(): void {
    this.state.entryMode = 'decrement';
  }

  /**
   * Turn on auto scroll
   */
  public autoscroll(): void {
    this.state.autoScroll = true;
  }

  /**
   * Turn off auto scroll
   */
  public noAutoscroll(): void {
    this.state.autoScroll = false;
  }

  /**
   * Get current display state
   */
  public getState(): LCDState {
    return { ...this.state, display: this.state.display.map(row => [...row]) };
  }

  /**
   * Get display content as string array
   */
  public getDisplayContent(): string[] {
    return this.state.display.map(row => row.join(''));
  }

  /**
   * Get pins configuration
   */
  public getPins(): typeof this.pins {
    return { ...this.pins };
  }

  /**
   * Get configuration
   */
  public getConfig(): LCDConfig {
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
  public onDisplayUpdate(callback: (state: LCDState) => void): void {
    this.onDisplayUpdateCallback = callback;
  }

  /**
   * Set backlight change callback
   */
  public onBacklightChange(callback: (on: boolean) => void): void {
    this.onBacklightChangeCallback = callback;
  }

  /**
   * Get power consumption (mA)
   */
  public getPowerConsumption(): number {
    if (!this.isInitialized) return 0;
    
    let consumption = 2; // Base LCD consumption
    
    if (this.state.displayOn) {
      consumption += 1;
    }
    
    if (this.state.backlightOn && this.config.backlight) {
      consumption += 20; // Backlight consumption
    }
    
    return consumption;
  }

  /**
   * Simulate command execution delay
   */
  private waitForCommand(delayMicroseconds: number): void {
    const now = Date.now() * 1000; // Convert to microseconds
    const timeSinceLastCommand = now - this.lastCommandTime;
    
    if (timeSinceLastCommand < delayMicroseconds) {
      // In real implementation, this would block
      // For simulation, we just track the timing
    }
    
    this.lastCommandTime = now + delayMicroseconds;
  }

  /**
   * Trigger display update callback
   */
  private triggerDisplayUpdate(): void {
    if (this.onDisplayUpdateCallback) {
      this.onDisplayUpdateCallback(this.getState());
    }
  }

  /**
   * Print formatted number
   */
  public printNumber(number: number, digits: number = 0): void {
    let numStr = number.toString();
    
    if (digits > 0 && numStr.length > digits) {
      numStr = numStr.substring(0, digits);
    }
    
    this.print(numStr);
  }

  /**
   * Print centered text on specified row
   */
  public printCentered(text: string, row: number): void {
    if (text.length >= this.config.columns) {
      this.setCursor(0, row);
      this.print(text.substring(0, this.config.columns));
    } else {
      const padding = Math.floor((this.config.columns - text.length) / 2);
      this.setCursor(padding, row);
      this.print(text);
    }
  }

  /**
   * Create loading animation
   */
  public showLoadingAnimation(row: number, duration: number = 2000): void {
    const frames = ['|', '/', '-', '\\'];
    let frameIndex = 0;
    const originalCol = this.state.cursorPosition.col;
    
    const animate = () => {
      if (duration <= 0) {
        this.setCursor(originalCol, row);
        return;
      }
      
      this.setCursor(this.config.columns - 1, row);
      this.write(frames[frameIndex]);
      frameIndex = (frameIndex + 1) % frames.length;
      
      setTimeout(animate, 200);
      duration -= 200;
    };
    
    animate();
  }
}