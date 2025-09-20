# ElectroSim Installation Guide

This guide provides step-by-step instructions for installing ElectroSim on Windows, macOS, and Linux systems.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Installation](#quick-installation)
3. [Platform-Specific Installation](#platform-specific-installation)
4. [Building from Source](#building-from-source)
5. [CLI Tools Installation](#cli-tools-installation)
6. [Troubleshooting](#troubleshooting)
7. [Verification](#verification)

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10, macOS 10.14 (Mojave), or Linux (Ubuntu 18.04+ / equivalent)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 500MB free disk space
- **Graphics**: Hardware-accelerated graphics card
- **Network**: Internet connection for initial download and updates

### Recommended Specifications
- **RAM**: 8GB or higher for complex circuits
- **CPU**: Multi-core processor (Intel i5 / AMD Ryzen 5 or better)
- **Graphics**: Dedicated graphics card for smooth canvas rendering
- **Storage**: SSD for faster application loading
- **Display**: 1920x1080 resolution or higher

## Quick Installation

### Option 1: Download Prebuilt Application (Recommended)

1. **Visit the Releases Page**
   - Go to [GitHub Releases](https://github.com/jmassardo/electrosim/releases)
   - Download the latest version for your operating system

2. **Choose Your Platform**
   - **Windows**: `ElectroSim-Setup-1.0.0.exe`
   - **macOS**: `ElectroSim-1.0.0.dmg`
   - **Linux**: `ElectroSim-1.0.0.AppImage` or `electrosim_1.0.0_amd64.deb`

3. **Install and Launch**
   - Follow platform-specific installation instructions below
   - Launch ElectroSim from your applications menu

## Platform-Specific Installation

### Windows Installation

#### Method 1: Windows Installer (Recommended)
1. **Download** `ElectroSim-Setup-1.0.0.exe` from the releases page
2. **Run the installer** as Administrator (right-click → "Run as administrator")
3. **Follow the installation wizard**:
   - Choose installation directory (default: `C:\Program Files\ElectroSim`)
   - Select additional tasks (desktop shortcut, start menu entry)
   - Review and accept license terms
   - Click "Install" to begin installation
4. **Launch ElectroSim** from the Start Menu or desktop shortcut

#### Method 2: Portable Version
1. **Download** `ElectroSim-1.0.0-win-portable.zip`
2. **Extract** the ZIP file to a folder of your choice
3. **Run** `ElectroSim.exe` directly from the extracted folder
4. **No installation required** - the app runs in portable mode

#### Windows-Specific Notes
- **Windows Defender**: You may need to allow the application through Windows Defender SmartScreen
- **Antivirus Software**: Some antivirus programs may flag the installer; add an exception if needed
- **Updates**: The application will automatically check for updates and prompt you to install them

### macOS Installation

#### Method 1: DMG Installer (Recommended)
1. **Download** `ElectroSim-1.0.0.dmg` from the releases page
2. **Open the DMG file** by double-clicking it
3. **Drag ElectroSim** to the Applications folder in the mounted disk image
4. **Eject the disk image** when the copy is complete
5. **Launch ElectroSim** from Launchpad or Applications folder

#### Method 2: Homebrew (Advanced Users)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add our tap and install ElectroSim
brew tap jmassardo/electrosim
brew install --cask electrosim
```

#### macOS-Specific Notes
- **Gatekeeper**: First launch requires right-click → "Open" to bypass Gatekeeper warnings
- **Security & Privacy**: You may need to allow the app in System Preferences → Security & Privacy
- **Rosetta 2**: Intel Macs running Apple Silicon may need Rosetta 2 for compatibility
- **Auto-Updates**: macOS version includes built-in update checking

### Linux Installation

#### Method 1: AppImage (Universal)
1. **Download** `ElectroSim-1.0.0.AppImage` from the releases page
2. **Make it executable**:
   ```bash
   chmod +x ElectroSim-1.0.0.AppImage
   ```
3. **Run the application**:
   ```bash
   ./ElectroSim-1.0.0.AppImage
   ```
4. **Optional**: Create desktop entry for easy access

#### Method 2: Debian/Ubuntu Package
```bash
# Download the .deb package
wget https://github.com/jmassardo/electrosim/releases/download/v1.0.0/electrosim_1.0.0_amd64.deb

# Install the package
sudo dpkg -i electrosim_1.0.0_amd64.deb

# Install any missing dependencies
sudo apt-get install -f

# Launch ElectroSim
electrosim
```

#### Method 3: Snap Package
```bash
# Install from Snap Store
sudo snap install electrosim

# Launch ElectroSim
electrosim
```

#### Method 4: Flatpak
```bash
# Add Flathub repository (if not already added)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install ElectroSim
flatpak install flathub com.jmassardo.ElectroSim

# Launch ElectroSim
flatpak run com.jmassardo.ElectroSim
```

#### Linux-Specific Notes
- **Dependencies**: Most distributions include required libraries, but you may need to install:
  - `libgtk-3-0` for GUI support
  - `libnss3` for Chromium engine
  - `libxss1` for screen saver detection
- **Desktop Integration**: AppImage provides automatic desktop integration
- **Permissions**: Some features may require additional permissions on security-focused distributions

## Building from Source

For developers or users who want the latest features:

### Prerequisites
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Python**: Version 3.8+ (for native module compilation)
- **Build Tools**: Platform-specific compilers

#### Platform-Specific Build Tools

**Windows:**
```powershell
# Install Visual Studio Build Tools
# Or install Visual Studio Community with C++ workload
npm install --global windows-build-tools
```

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install build-essential git python3-dev
```

**Linux (Red Hat/Fedora):**
```bash
sudo dnf groupinstall "Development Tools"
sudo dnf install git python3-devel
```

### Build Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/jmassardo/electrosim.git
   cd electrosim
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Application**
   ```bash
   # Development build
   npm run build
   
   # Production build
   npm run build:prod
   ```

4. **Package the Application** (Optional)
   ```bash
   # Package for current platform
   npm run package
   
   # Package for all platforms
   npm run package:all
   
   # Package for specific platform
   npm run package:win
   npm run package:mac
   npm run package:linux
   ```

5. **Run in Development Mode**
   ```bash
   npm run dev
   ```

### Advanced Build Configuration

#### Custom Build Options
```bash
# Build with specific target
npm run build -- --target=electron

# Build with debug symbols
npm run build:debug

# Build with optimizations disabled (faster compilation)
npm run build:fast
```

#### Environment Variables
```bash
# Custom build configuration
export NODE_ENV=production
export ELECTRON_BUILDER_CACHE_DIR=/tmp/electron-builder
export DEBUG=electron-builder

# Platform-specific settings
export CSC_LINK=path/to/certificate.p12  # macOS code signing
export WIN_CSC_LINK=path/to/certificate.p12  # Windows code signing
```

## CLI Tools Installation

ElectroSim includes command-line tools for headless operation:

### Global Installation
```bash
npm install -g electrosim
```

### Local Installation
```bash
# In your project directory
npm install electrosim --save-dev
```

### CLI Usage
```bash
# Run simulation from command line
electrosim simulate --project myproject.electrosim --output results.json

# Convert circuit to Arduino sketch
electrosim export --project myproject.electrosim --format arduino

# Validate circuit
electrosim validate --project myproject.electrosim

# Show help
electrosim --help
```

## Troubleshooting

### Common Installation Issues

#### Windows Issues

**Problem**: "Windows protected your PC" message
```
Solution:
1. Click "More info"
2. Click "Run anyway"
3. Or disable Windows Defender SmartScreen temporarily
```

**Problem**: Installation fails with permission errors
```
Solution:
1. Run installer as Administrator
2. Ensure Windows user has installation privileges
3. Check if antivirus is blocking installation
```

**Problem**: Application won't start after installation
```
Solution:
1. Install Microsoft Visual C++ Redistributables
2. Update Windows to latest version
3. Check Windows Event Viewer for error details
```

#### macOS Issues

**Problem**: "ElectroSim is damaged and can't be opened"
```
Solution:
1. Run: sudo xattr -rd com.apple.quarantine /Applications/ElectroSim.app
2. Or download directly from GitHub instead of third-party sites
```

**Problem**: Permission denied when launching
```
Solution:
1. Right-click ElectroSim.app → Open
2. Or: System Preferences → Security & Privacy → Allow ElectroSim
```

**Problem**: App crashes on startup (Apple Silicon Macs)
```
Solution:
1. Install Rosetta 2: softwareupdate --install-rosetta
2. Or download Apple Silicon native build
```

#### Linux Issues

**Problem**: AppImage won't run
```
Solution:
1. chmod +x ElectroSim-1.0.0.AppImage
2. Install FUSE: sudo apt install fuse libfuse2
3. Check: ldd ElectroSim-1.0.0.AppImage
```

**Problem**: Missing library errors
```
Solution:
# Ubuntu/Debian:
sudo apt install libgtk-3-0 libnss3 libxss1 libgconf-2-4 libdrm2

# Fedora/CentOS:
sudo dnf install gtk3 nss libXScrnSaver GConf2 libdrm
```

**Problem**: Blank/white window on startup
```
Solution:
1. Update graphics drivers
2. Try: electrosim --disable-gpu
3. Or: electrosim --disable-hardware-acceleration
```

### Build Issues

#### Node.js/npm Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use specific Node version
nvm install 18
nvm use 18
```

#### Native Module Compilation Issues
```bash
# Rebuild native modules
npm rebuild

# Install with specific Python version
npm config set python python3.8
npm install

# Windows: Install build tools
npm install --global windows-build-tools
```

#### Memory Issues During Build
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Performance Issues

#### Slow Startup
- **Windows**: Exclude ElectroSim directory from antivirus scanning
- **macOS**: Allow ElectroSim in Privacy settings
- **Linux**: Use SSD storage, check for sufficient RAM

#### Canvas Rendering Issues
- Update graphics drivers
- Try software rendering: `--disable-gpu` command line flag
- Reduce simulation complexity
- Increase system RAM

#### Memory Usage
- Close unnecessary browser tabs
- Restart ElectroSim periodically for long sessions
- Monitor system memory usage
- Consider upgrading RAM for complex projects

### Getting Help

If you continue to experience issues:

1. **Check GitHub Issues**: [ElectroSim Issues](https://github.com/jmassardo/electrosim/issues)
2. **Create New Issue**: Include system info, error messages, and steps to reproduce
3. **Join Community**: Discord server for real-time help
4. **Check Documentation**: [User Guide](USER_GUIDE.md) and [FAQ](FAQ.md)

## Verification

### Test Installation

After installation, verify ElectroSim works correctly:

1. **Launch Application**
   - ElectroSim should start without errors
   - Main interface should appear within 10 seconds

2. **Create Test Project**
   - File → New Project
   - Drag an Arduino Uno to the canvas
   - Add an LED and resistor
   - Save the project

3. **Test Simulation**
   - Write simple blink code
   - Upload to virtual Arduino
   - Start simulation
   - LED should blink

4. **Check Features**
   - Canvas zoom and pan work smoothly
   - Component library loads completely
   - Code editor syntax highlighting works
   - Serial monitor displays output

### System Information

To report issues, gather system information:

**Windows:**
```cmd
systeminfo
dxdiag
```

**macOS:**
```bash
system_profiler SPSoftwareDataType
system_profiler SPHardwareDataType
```

**Linux:**
```bash
uname -a
lscpu
lsb_release -a
```

### Version Information
Check ElectroSim version: Help → About ElectroSim

---

You're now ready to start using ElectroSim! Check out the [User Guide](USER_GUIDE.md) for tutorials and examples.

Happy Simulating! 🚀