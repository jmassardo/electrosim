/**
 * Arduino IDE Project Exporter
 * Generates Arduino IDE compatible project folders with proper structure
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ElectroSimProject,
  LibraryReference,
  ArduinoExportConfig,
} from '../models/Project';

export interface ExportedLibrary {
  name: string;
  version: string;
  path: string;
  dependencies: string[];
}

export class ArduinoIDEExporter {
  private readonly builtinLibraries = new Set([
    'EEPROM',
    'Ethernet',
    'Firmata',
    'GSM',
    'LiquidCrystal',
    'SD',
    'Servo',
    'SoftwareSerial',
    'Stepper',
    'WiFi',
    'Wire',
    'SPI',
  ]);

  /**
   * Export project to Arduino IDE format
   */
  async exportProject(
    project: ElectroSimProject,
    outputPath: string,
    config: Partial<ArduinoExportConfig> = {}
  ): Promise<void> {
    const exportConfig: ArduinoExportConfig = {
      includeDiagram: true,
      includeLibraries: true,
      generateReadme: true,
      optimizeCode: false,
      target: 'arduino-ide',
      ...config,
    };

    const projectName = this.sanitizeFileName(project.metadata.name);
    const sketchPath = path.join(outputPath, projectName);

    try {
      // Create sketch folder
      await fs.mkdir(sketchPath, { recursive: true });

      // Generate main sketch file
      await this.generateSketchFile(project, sketchPath, projectName, exportConfig);

      // Handle libraries
      if (exportConfig.includeLibraries) {
        await this.exportLibraries(project, sketchPath);
      }

      // Generate circuit diagram (if enabled)
      if (exportConfig.includeDiagram) {
        await this.generateCircuitDiagram(project, sketchPath);
      }

      // Generate documentation
      if (exportConfig.generateReadme) {
        await this.generateReadme(project, sketchPath, exportConfig);
      }

      // Generate additional files based on target
      if (exportConfig.target === 'platformio' || exportConfig.target === 'both') {
        await this.generatePlatformIOConfig(project, sketchPath);
      }

    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate the main Arduino sketch file
   */
  private async generateSketchFile(
    project: ElectroSimProject,
    sketchPath: string,
    projectName: string,
    config: ArduinoExportConfig
  ): Promise<void> {
    const sketchFileName = `${projectName}.ino`;
    const sketchFilePath = path.join(sketchPath, sketchFileName);

    // Process the sketch code
    let sketchCode = project.code.mainSketch;

    // Add library includes
    const includes = this.generateIncludes(project.code.libraries, project.code.includes);
    if (includes.length > 0) {
      sketchCode = includes.join('\n') + '\n\n' + sketchCode;
    }

    // Add header comment
    const header = this.generateSketchHeader(project);
    sketchCode = header + '\n\n' + sketchCode;

    // Optimize code if requested
    if (config.optimizeCode) {
      sketchCode = this.optimizeSketchCode(sketchCode);
    }

    await fs.writeFile(sketchFilePath, sketchCode, 'utf-8');
  }

  /**
   * Export required libraries
   */
  private async exportLibraries(
    project: ElectroSimProject,
    sketchPath: string
  ): Promise<void> {
    const librariesPath = path.join(sketchPath, 'libraries');
    const exportedLibraries: ExportedLibrary[] = [];

    // Create libraries folder
    await fs.mkdir(librariesPath, { recursive: true });

    // Process each library
    for (const lib of project.code.libraries) {
      if (this.builtinLibraries.has(lib.name)) {
        // Skip built-in libraries - they don't need to be exported
        continue;
      }

      try {
        const exported = await this.exportLibrary(lib, librariesPath);
        if (exported) {
          exportedLibraries.push(exported);
        }
      } catch (error) {
        console.warn(`Failed to export library ${lib.name}:`, error);
      }
    }

    // Generate libraries manifest
    if (exportedLibraries.length > 0) {
      await this.generateLibrariesManifest(exportedLibraries, librariesPath);
    }
  }

  /**
   * Export individual library
   */
  private async exportLibrary(
    lib: LibraryReference,
    librariesPath: string
  ): Promise<ExportedLibrary | null> {
    const libPath = path.join(librariesPath, lib.name);

    try {
      await fs.mkdir(libPath, { recursive: true });

      // Copy library files based on source
      switch (lib.source) {
        case 'local':
          if (lib.path) {
            await this.copyLibraryFiles(lib.path, libPath);
          }
          break;

        case 'community':
          // For community libraries, we'll create a placeholder with instructions
          await this.generateLibraryPlaceholder(lib, libPath);
          break;

        case 'builtin':
          // Built-in libraries are handled elsewhere
          return null;

        default:
          console.warn(`Unknown library source: ${lib.source}`);
          return null;
      }

      return {
        name: lib.name,
        version: lib.version || 'latest',
        path: libPath,
        dependencies: lib.dependencies || [],
      };

    } catch (error) {
      console.error(`Failed to export library ${lib.name}:`, error);
      return null;
    }
  }

  /**
   * Copy library files from source to destination
   */
  private async copyLibraryFiles(sourcePath: string, destPath: string): Promise<void> {
    try {
      const stats = await fs.stat(sourcePath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(sourcePath);
        
        for (const file of files) {
          const srcFile = path.join(sourcePath, file);
          const destFile = path.join(destPath, file);
          const fileStats = await fs.stat(srcFile);
          
          if (fileStats.isDirectory()) {
            await fs.mkdir(destFile, { recursive: true });
            await this.copyLibraryFiles(srcFile, destFile);
          } else {
            await fs.copyFile(srcFile, destFile);
          }
        }
      } else {
        // Single file library
        const fileName = path.basename(sourcePath);
        const destFile = path.join(destPath, fileName);
        await fs.copyFile(sourcePath, destFile);
      }
    } catch (error) {
      throw new Error(`Failed to copy library files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate placeholder for community libraries
   */
  private async generateLibraryPlaceholder(lib: LibraryReference, libPath: string): Promise<void> {
    const readmePath = path.join(libPath, 'README.md');
    const readmeContent = `# ${lib.name}

This project requires the "${lib.name}" library.

## Installation Instructions

1. Open Arduino IDE
2. Go to Tools → Manage Libraries
3. Search for "${lib.name}"
4. Install version ${lib.version || 'latest'}

## Alternative Installation

You can also download the library from:
- Arduino Library Manager
- GitHub repository
- Official library website

## Dependencies

${lib.dependencies && lib.dependencies.length > 0 
  ? lib.dependencies.map(dep => `- ${dep}`).join('\n')
  : 'No additional dependencies required.'
}

---
Generated by ElectroSim Export Tool
`;

    await fs.writeFile(readmePath, readmeContent, 'utf-8');
  }

  /**
   * Generate libraries manifest
   */
  private async generateLibrariesManifest(
    libraries: ExportedLibrary[],
    librariesPath: string
  ): Promise<void> {
    const manifestPath = path.join(librariesPath, 'libraries.json');
    const manifest = {
      version: '1.0.0',
      libraries: libraries.map(lib => ({
        name: lib.name,
        version: lib.version,
        dependencies: lib.dependencies,
      })),
      generatedBy: 'ElectroSim',
      generatedAt: new Date().toISOString(),
    };

    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  /**
   * Generate circuit diagram file
   */
  private async generateCircuitDiagram(project: ElectroSimProject, sketchPath: string): Promise<void> {
    const diagramPath = path.join(sketchPath, 'circuit.json');
    const diagram = {
      metadata: {
        name: project.metadata.name,
        description: 'Circuit diagram for Arduino IDE',
        boardType: project.circuit.boardType,
        generatedBy: 'ElectroSim',
        generatedAt: new Date().toISOString(),
      },
      circuit: {
        components: project.circuit.components,
        wires: project.circuit.wires,
      },
    };

    await fs.writeFile(diagramPath, JSON.stringify(diagram, null, 2), 'utf-8');
  }

  /**
   * Generate README documentation
   */
  private async generateReadme(
    project: ElectroSimProject,
    sketchPath: string,
    config: ArduinoExportConfig
  ): Promise<void> {
    const readmePath = path.join(sketchPath, 'README.md');
    
    const readme = `# ${project.metadata.name}

${project.metadata.description}

## Project Information

- **Author**: ${project.metadata.author}
- **Created**: ${project.metadata.created.toDateString()}
- **Board Type**: ${project.circuit.boardType}
- **Tags**: ${project.metadata.tags.join(', ') || 'None'}

## Hardware Requirements

### Arduino Board
- ${this.getBoardDisplayName(project.circuit.boardType)}

### Components
${this.generateComponentsList(project)}

## Circuit Connections

${this.generateConnectionsTable(project)}

## Libraries Required

${this.generateLibrariesList(project)}

## Installation Instructions

1. **Install Arduino IDE**: Download and install the latest Arduino IDE from [arduino.cc](https://www.arduino.cc/)

2. **Install Libraries**: 
${project.code.libraries.length > 0 
  ? '   - Open Arduino IDE\n   - Go to Tools → Manage Libraries\n   - Search and install the required libraries listed above'
  : '   - No additional libraries required'
}

3. **Upload Code**:
   - Connect your Arduino board to your computer
   - Open the \`${this.sanitizeFileName(project.metadata.name)}.ino\` file in Arduino IDE
   - Select the correct board and port from Tools menu
   - Click Upload button

## Usage

${this.generateUsageInstructions(project)}

## Circuit Diagram

${config.includeDiagram 
  ? 'The circuit diagram is included as \`circuit.json\` and can be imported back into ElectroSim.'
  : 'Circuit diagram not included in this export.'
}

## Compilation Settings

- **Optimization**: ${project.settings.compilation.optimization}
- **Warnings**: ${project.settings.compilation.warnings}
- **Debug Symbols**: ${project.settings.compilation.debugSymbols ? 'Enabled' : 'Disabled'}

---

*This project was exported from ElectroSim - Arduino Circuit Simulator*
*For more information, visit: [ElectroSim](https://electrosim.app)*
`;

    await fs.writeFile(readmePath, readme, 'utf-8');
  }

  /**
   * Generate PlatformIO configuration
   */
  private async generatePlatformIOConfig(project: ElectroSimProject, sketchPath: string): Promise<void> {
    const platformioPath = path.join(sketchPath, 'platformio.ini');
    
    const boardMapping: Record<string, string> = {
      'uno': 'uno',
      'nano': 'nanoatmega328',
      'mega': 'megaatmega2560',
      'leonardo': 'leonardo',
      'micro': 'micro',
    };

    const board = boardMapping[project.circuit.boardType] || 'uno';
    
    const config = `; PlatformIO Project Configuration File
; Generated by ElectroSim

[env:${board}]
platform = atmelavr
board = ${board}
framework = arduino

; Serial Monitor options
monitor_speed = ${project.settings.arduino.baudRate}

; Build flags
build_flags = 
    -D ${project.settings.compilation.optimization}
    ${project.settings.compilation.debugSymbols ? '-g' : ''}

; Library dependencies
lib_deps = 
${project.code.libraries
  .filter(lib => !this.builtinLibraries.has(lib.name))
  .map(lib => `    ${lib.name}${lib.version ? `@${lib.version}` : ''}`)
  .join('\n')
}

; Upload settings
upload_speed = 115200
`;

    await fs.writeFile(platformioPath, config, 'utf-8');
  }

  /**
   * Generate includes for sketch
   */
  private generateIncludes(libraries: LibraryReference[], includes: string[]): string[] {
    const includeStatements: string[] = [];

    // Add library includes
    for (const lib of libraries) {
      if (this.builtinLibraries.has(lib.name)) {
        includeStatements.push(`#include <${lib.name}.h>`);
      }
    }

    // Add custom includes
    for (const include of includes) {
      if (!includeStatements.includes(include)) {
        includeStatements.push(include);
      }
    }

    return includeStatements;
  }

  /**
   * Generate sketch header comment
   */
  private generateSketchHeader(project: ElectroSimProject): string {
    return `/*
 * ${project.metadata.name}
 * 
 * ${project.metadata.description}
 * 
 * Author: ${project.metadata.author}
 * Created: ${project.metadata.created.toDateString()}
 * Board: ${this.getBoardDisplayName(project.circuit.boardType)}
 * 
 * Generated by ElectroSim - Arduino Circuit Simulator
 * https://electrosim.app
 */`;
  }

  /**
   * Optimize sketch code (basic optimization)
   */
  private optimizeSketchCode(code: string): string {
    // Basic optimizations:
    // - Remove unnecessary whitespace
    // - Remove empty lines (but keep some for readability)
    // - Remove single-line comments (preserve multi-line comments)
    
    return code
      .split('\n')
      .map(line => line.trimRight()) // Remove trailing whitespace
      .filter((line, index, array) => {
        // Remove excessive empty lines (keep max 2 consecutive)
        if (line.trim() === '') {
          const prevEmpty = index > 0 && array[index - 1].trim() === '';
          const prevPrevEmpty = index > 1 && array[index - 2].trim() === '';
          return !(prevEmpty && prevPrevEmpty);
        }
        return true;
      })
      .join('\n');
  }

  /**
   * Generate components list for README
   */
  private generateComponentsList(project: ElectroSimProject): string {
    if (project.circuit.components.length === 0) {
      return 'No additional components required.';
    }

    const componentCounts: Record<string, number> = {};
    
    for (const component of project.circuit.components) {
      const type = component.type;
      componentCounts[type] = (componentCounts[type] || 0) + 1;
    }

    return Object.entries(componentCounts)
      .map(([type, count]) => `- ${count}x ${type}`)
      .join('\n');
  }

  /**
   * Generate connections table for README
   */
  private generateConnectionsTable(project: ElectroSimProject): string {
    if (project.circuit.wires.length === 0) {
      return 'No connections defined.';
    }

    const connections = project.circuit.wires
      .map(wire => `| ${wire.from} | ${wire.to} |`)
      .join('\n');

    return `| From | To |\n|------|----|\n${connections}`;
  }

  /**
   * Generate libraries list for README
   */
  private generateLibrariesList(project: ElectroSimProject): string {
    if (project.code.libraries.length === 0) {
      return 'No additional libraries required.';
    }

    return project.code.libraries
      .map(lib => `- **${lib.name}**${lib.version ? ` (version ${lib.version})` : ''} - ${lib.source} library`)
      .join('\n');
  }

  /**
   * Generate usage instructions
   */
  private generateUsageInstructions(project: ElectroSimProject): string {
    // This could be enhanced to analyze the code and provide more specific instructions
    return `1. Connect the components according to the circuit diagram
2. Upload the code to your Arduino board
3. Open the Serial Monitor at ${project.settings.arduino.baudRate} baud rate
4. Observe the output and interact with your circuit

*Note: Refer to the code comments for specific usage instructions.*`;
  }

  /**
   * Get display name for board type
   */
  private getBoardDisplayName(boardType: string): string {
    const displayNames: Record<string, string> = {
      'uno': 'Arduino Uno R3',
      'nano': 'Arduino Nano',
      'mega': 'Arduino Mega 2560',
      'leonardo': 'Arduino Leonardo',
      'micro': 'Arduino Micro',
    };

    return displayNames[boardType] || boardType;
  }

  /**
   * Sanitize file name for file system compatibility
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid chars with underscore
      .replace(/_+/g, '_')            // Replace multiple underscores with single
      .replace(/^_|_$/g, '')          // Remove leading/trailing underscores
      .substring(0, 50)               // Limit length
      || 'untitled';                  // Fallback name
  }
}