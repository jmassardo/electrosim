# ElectroSim Project Setup Scripts

This directory contains automated setup scripts for organizing the ElectroSim project on GitHub.

## Scripts Available

### 1. `milestone_setup.sh` - Milestone Creation & Issue Assignment
Creates 8 project milestones spanning 18 months and assigns all 36 issues to appropriate milestones.

### 2. `labels_setup.sh` - Comprehensive Label System  
Creates a complete labeling system with 50+ labels for issue organization.

## Usage

### Prerequisites
1. Install GitHub CLI: `brew install gh` (macOS) or visit https://cli.github.com/
2. Authenticate: `gh auth login`

### Running the Scripts

```bash
# First, make the scripts executable and rename them
mv milestone_setup.txt milestone_setup.sh
mv labels_setup.txt labels_setup.sh
chmod +x milestone_setup.sh labels_setup.sh

# Run the label setup first (recommended)
./labels_setup.sh

# Then run the milestone setup
./milestone_setup.sh
```

## What Gets Created

### Milestones (8 total)
- **Phase 1: Foundation Complete** - Dec 18, 2025 (Issues #1-6)
- **Phase 2: Basic Simulation Complete** - Mar 18, 2026 (Issues #7-12)
- **Phase 3: Enhanced Features Complete** - Jun 18, 2026 (Issues #13-18)
- **Phase 4: Advanced Features Complete** - Sep 18, 2026 (Issues #19-25)
- **Headless Mode Ready** - Oct 18, 2026 (Issues #26-28)
- **Virtual Serial Port Ready** - Nov 18, 2026 (Issues #29-30)
- **Beta Release** - Dec 18, 2026 (Issues #31-35)
- **Production Release** - Mar 18, 2027 (Issue #36)

### Labels (50+ total)
- **Priority:** high-priority, medium-priority, low-priority
- **Phases:** phase-1, phase-2, phase-3, phase-4
- **Technology:** react, electron, typescript, canvas, avr, serial, cli
- **Components:** arduino-board, led, resistor, sensors, display, motors, audio
- **Protocols:** uart, i2c, spi, virtual-port
- **Features:** code-editor, debugging, performance, security
- **Special:** education, headless-mode, cross-platform, ci-cd

## Issue Assignment Summary

- **Phase 1 (Issues #1-6):** Foundation work - development environment, UI framework, canvas system, component architecture, AVR integration, testing
- **Phase 2 (Issues #7-12):** Basic simulation - Arduino Uno, LEDs, resistors, switches, wiring, simulation engine
- **Phase 3 (Issues #13-18):** Enhanced features - multiple Arduino boards, sensors, displays, code editor, compilation, project management
- **Phase 4 (Issues #19-25):** Advanced features - serial communication, protocols, debugging, performance optimization, comprehensive testing
- **Special Features (Issues #26-36):** Headless mode, virtual serial ports, advanced components, documentation, packaging, security

## After Running Scripts

1. **View Results:**
   - Milestones: https://github.com/jmassardo/electrosim/milestones
   - Labels: https://github.com/jmassardo/electrosim/labels
   - Issues: https://github.com/jmassardo/electrosim/issues

2. **Next Steps:**
   - Create a GitHub Project board
   - Apply additional labels to issues manually if needed
   - Start development with Phase 1 issues!

## Project Timeline

The 18-month timeline spans from September 2025 to March 2027:
- **Months 1-3:** Foundation & Infrastructure
- **Months 4-6:** Basic Simulation Core
- **Months 7-9:** Enhanced Components & Features  
- **Months 10-12:** Communication & Advanced Simulation
- **Months 13-15:** Special Features & Beta Release
- **Months 16-18:** Production Polish & Release

## Support

If you encounter any issues:
1. Ensure GitHub CLI is installed and authenticated
2. Check that you have push access to the repository
3. Verify issue numbers exist (script assumes issues #1-36 exist)

Happy coding! 🚀