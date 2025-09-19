# ElectroSim Branding Guidelines

## Brand Identity

**ElectroSim** is a cross-platform Arduino circuit simulator designed for education, prototyping, and development.

### Brand Values
- **Educational**: Making electronics learning accessible
- **Professional**: Reliable tool for development workflows
- **Intuitive**: Easy to use for beginners and experts alike
- **Modern**: Contemporary design and technology stack

## Visual Identity

### Logo Concept
The ElectroSim logo combines:
- **🔌** Electric plug emoji representing power and connectivity
- **Circuit-inspired typography** suggesting electronic components
- **Modern color palette** reflecting professionalism and innovation

### Color Palette

#### Primary Colors
- **ElectroSim Blue**: `#60a5fa` (rgb(96, 165, 250))
  - Used for primary actions, logos, and highlights
  - Conveys trust, technology, and innovation

- **Deep Space**: `#2f3349` (rgb(47, 51, 73))
  - Used for backgrounds, window frames, and UI structure
  - Provides professional appearance and good contrast

#### Secondary Colors
- **Gradient Primary**: `#667eea` (rgb(102, 126, 234))
- **Gradient Secondary**: `#764ba2` (rgb(118, 75, 162))
- **Success Green**: `#10b981` (rgb(16, 185, 129))
- **Warning Orange**: `#f59e0b` (rgb(245, 158, 11))
- **Error Red**: `#ef4444` (rgb(239, 68, 68))

### Typography
- **Primary Font**: System fonts (San Francisco, Segoe UI, Roboto)
- **Monospace**: For code and technical content
- **Icon Font**: Material-UI Icons for consistency

### Application Icon Design

The application icon should be:
- **Size**: 512x512px base size with scaled versions (256px, 128px, 64px, 32px, 16px)
- **Format**: PNG with transparency for cross-platform compatibility
- **Design Elements**:
  - Central circuit board motif
  - Electric blue color scheme
  - Modern, flat design aesthetic
  - Readable at small sizes

### Icon Specifications

#### File Structure
```
assets/icons/
├── icon.icns          # macOS bundle icon
├── icon.ico           # Windows executable icon
├── icon.png           # Linux desktop icon (512px)
├── icon-256.png       # High DPI displays
├── icon-128.png       # Standard displays
├── icon-64.png        # Small displays
├── icon-32.png        # Dock/taskbar
└── icon-16.png        # Menu bar
```

#### Platform-Specific Requirements

**macOS (.icns)**
- Sizes: 16, 32, 64, 128, 256, 512, 1024px
- Retina support with @2x variants
- Rounded corners handled by system

**Windows (.ico)**
- Sizes: 16, 32, 48, 64, 128, 256px
- Embedded in executable
- Sharp edges, no rounded corners

**Linux (.png)**
- Primary: 512px PNG with transparency
- Additional sizes for different desktop environments
- Follows freedesktop.org icon specification

## Usage Guidelines

### Do's
- Use the official color palette consistently
- Maintain proper spacing and proportions
- Ensure good contrast for accessibility
- Use the plug emoji (🔌) in text references

### Don'ts
- Don't alter the color palette significantly
- Don't use the logo on backgrounds with poor contrast
- Don't stretch or distort logo elements
- Don't use unofficial variations

## Implementation Notes

The current implementation uses:
- Material-UI's Memory icon as placeholder
- Gradient backgrounds for visual appeal
- Consistent spacing using 8px grid system
- Responsive design for different screen sizes

Future enhancements should include:
- Custom SVG logo design
- Professional icon set creation
- Brand asset management system
- Style guide documentation

---

**Created**: Development Phase 1 - Application Shell
**Last Updated**: September 19, 2025
**Version**: 1.0.0