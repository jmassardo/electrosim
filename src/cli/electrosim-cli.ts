#!/usr/bin/env node

/**
 * ElectroSim CLI
 * Command-line interface for headless Arduino simulation and testing
 * Enables CI/CD integration and automated testing workflows
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ArduinoIDE } from '../simulation/ide/ArduinoIDE';
import { TestRunner } from './TestRunner';

const program = new Command();
const ide = new ArduinoIDE();
const testRunner = new TestRunner(ide);

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════╗
║                    ElectroSim CLI                      ║
║               Arduino Simulation & Testing             ║
╚═══════════════════════════════════════════════════════╝
`;

program
  .name('electrosim')
  .version('1.0.0')
  .description('Arduino simulation and testing CLI for ElectroSim')
  .hook('preAction', () => {
    console.log(chalk.cyan(banner));
  });

/**
 * Compile command - compile Arduino sketch
 */
program
  .command('compile')
  .description('Compile an Arduino sketch')
  .argument('<sketch>', 'Path to Arduino sketch file (.ino)')
  .option('-b, --board <board>', 'Target board (uno, nano, mega, leonardo)', 'uno')
  .option('-v, --verbose', 'Verbose compilation output', false)
  .option('-o, --output <dir>', 'Output directory for compiled files')
  .action(async (sketchPath: string, options: any) => {
    try {
      console.log(chalk.yellow('🔧 Compiling Arduino sketch...'));
      console.log(chalk.gray(`Sketch: ${sketchPath}`));
      console.log(chalk.gray(`Board: ${options.board}`));
      
      // Read sketch file
      if (!fs.existsSync(sketchPath)) {
        console.error(chalk.red(`❌ Sketch file not found: ${sketchPath}`));
        process.exit(1);
      }
      
      const code = fs.readFileSync(sketchPath, 'utf8');
      const projectName = path.basename(sketchPath, '.ino');
      
      // Create project
      const project = ide.createProject(projectName, 'blank', options.board);
      project.code = code;
      
      // Compile
      const result = await ide.compileProject(project.id);
      
      if (result.success) {
        console.log(chalk.green('✅ Compilation successful!'));
        console.log(chalk.gray(`Binary size: ${result.binarySize} bytes`));
        console.log(chalk.gray(`Flash usage: ${result.memoryUsage.flash} bytes`));
        console.log(chalk.gray(`SRAM usage: ${result.memoryUsage.sram} bytes`));
        
        // Save output files if specified
        if (options.output) {
          const outputDir = path.resolve(options.output);
          fs.mkdirSync(outputDir, { recursive: true });
          
          const hexFile = path.join(outputDir, `${projectName}.hex`);
          fs.writeFileSync(hexFile, result.hexString);
          console.log(chalk.gray(`Hex file: ${hexFile}`));
        }
        
        process.exit(0);
      } else {
        console.log(chalk.red('❌ Compilation failed!'));
        
        result.errors.forEach(error => {
          console.log(chalk.red(`Error (${error.line}:${error.column}): ${error.message}`));
        });
        
        result.warnings.forEach(warning => {
          console.log(chalk.yellow(`Warning (${warning.line}:${warning.column}): ${warning.message}`));
        });
        
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Compilation error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Test command - run automated tests
 */
program
  .command('test')
  .description('Run automated tests for Arduino sketches')
  .argument('[path]', 'Path to test directory or test file', '.')
  .option('-b, --board <board>', 'Target board (uno, nano, mega, leonardo)', 'uno')
  .option('--timeout <ms>', 'Test timeout in milliseconds', '10000')
  .option('--watch', 'Watch for file changes and re-run tests', false)
  .option('--reporter <type>', 'Test reporter (console, json, junit)', 'console')
  .option('--coverage', 'Generate code coverage report', false)
  .action(async (testPath: string, options: any) => {
    try {
      console.log(chalk.yellow('🧪 Running Arduino tests...'));
      console.log(chalk.gray(`Test path: ${testPath}`));
      console.log(chalk.gray(`Board: ${options.board}`));
      console.log(chalk.gray(`Timeout: ${options.timeout}ms`));
      
      const config = {
        testPath: path.resolve(testPath),
        board: options.board,
        timeout: parseInt(options.timeout),
        reporter: options.reporter,
        coverage: options.coverage,
        watch: options.watch
      };
      
      const results = await testRunner.runTests(config);
      
      if (results.success) {
        console.log(chalk.green(`✅ All tests passed! (${results.passed}/${results.total})`));
        console.log(chalk.gray(`Total time: ${results.duration}ms`));
        process.exit(0);
      } else {
        console.log(chalk.red(`❌ ${results.failed} test(s) failed! (${results.passed}/${results.total})`));
        console.log(chalk.gray(`Total time: ${results.duration}ms`));
        
        // Show failed tests
        results.failures.forEach((failure: any) => {
          console.log(chalk.red(`\n  ${failure.name}:`));
          console.log(chalk.gray(`    ${failure.message}`));
        });
        
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Test error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Simulate command - run simulation
 */
program
  .command('simulate')
  .description('Run Arduino sketch simulation')
  .argument('<sketch>', 'Path to Arduino sketch file (.ino)')
  .option('-b, --board <board>', 'Target board (uno, nano, mega, leonardo)', 'uno')
  .option('-t, --time <ms>', 'Simulation time in milliseconds', '10000')
  .option('--serial', 'Show serial output', false)
  .option('--debug', 'Enable debug mode', false)
  .action(async (sketchPath: string, options: any) => {
    try {
      console.log(chalk.yellow('🔄 Running Arduino simulation...'));
      console.log(chalk.gray(`Sketch: ${sketchPath}`));
      console.log(chalk.gray(`Board: ${options.board}`));
      console.log(chalk.gray(`Duration: ${options.time}ms`));
      
      // Read and compile sketch
      const code = fs.readFileSync(sketchPath, 'utf8');
      const projectName = path.basename(sketchPath, '.ino');
      
      const project = ide.createProject(projectName, 'blank', options.board);
      project.code = code;
      
      const result = await ide.compileProject(project.id);
      if (!result.success) {
        console.log(chalk.red('❌ Compilation failed!'));
        result.errors.forEach(error => {
          console.log(chalk.red(`Error: ${error.message}`));
        });
        process.exit(1);
      }
      
      // Upload and run
      const uploaded = await ide.uploadAndRun(project.id);
      if (!uploaded) {
        console.log(chalk.red('❌ Upload failed!'));
        process.exit(1);
      }
      
      console.log(chalk.green('✅ Simulation started!'));
      
      // Set up serial monitoring if requested
      if (options.serial) {
        console.log(chalk.cyan('\n--- Serial Monitor ---'));
        ide.addEventListener('serial:data', (data: string) => {
          console.log(chalk.cyan(`Serial: ${data}`));
        });
      }
      
      // Run simulation for specified time
      await new Promise(resolve => setTimeout(resolve, parseInt(options.time)));
      
      // Stop simulation
      ide.stopEmulation();
      
      console.log(chalk.green('\n✅ Simulation completed!'));
      
      // Show final state
      const state = ide.getState();
      console.log(chalk.gray(`Final state: ${state.isEmulating ? 'Running' : 'Stopped'}`));
      
      if (options.serial && state.serialOutput.length > 0) {
        console.log(chalk.cyan('\n--- Serial Output Summary ---'));
        state.serialOutput.forEach(line => {
          console.log(chalk.cyan(line));
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red(`❌ Simulation error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Validate command - validate Arduino code
 */
program
  .command('validate')
  .description('Validate Arduino sketch syntax')
  .argument('<sketch>', 'Path to Arduino sketch file (.ino)')
  .action((sketchPath: string) => {
    try {
      console.log(chalk.yellow('🔍 Validating Arduino sketch...'));
      
      if (!fs.existsSync(sketchPath)) {
        console.error(chalk.red(`❌ Sketch file not found: ${sketchPath}`));
        process.exit(1);
      }
      
      const code = fs.readFileSync(sketchPath, 'utf8');
      const validation = ide.validateCode(code);
      
      if (validation.valid) {
        console.log(chalk.green('✅ Code is valid!'));
        process.exit(0);
      } else {
        console.log(chalk.red('❌ Code validation failed!'));
        validation.errors.forEach(error => {
          console.log(chalk.red(`Error: ${error}`));
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Validation error: ${error instanceof Error ? error.message : error}`));
      process.exit(1);
    }
  });

/**
 * Info command - show system information
 */
program
  .command('info')
  .description('Show system information and capabilities')
  .action(() => {
    console.log(chalk.cyan('📋 ElectroSim System Information'));
    console.log('');
    
    console.log(chalk.white('Compiler:'));
    console.log(`  Arduino CLI Available: ${ide.isCompilerAvailable() ? chalk.green('Yes') : chalk.red('No')}`);
    
    console.log('');
    console.log(chalk.white('Supported Boards:'));
    const boards = ide.getSupportedBoards();
    boards.forEach(board => {
      console.log(chalk.gray(`  - ${board.name} (${board.fqbn})`));
    });
    
    console.log('');
    console.log(chalk.white('Templates:'));
    const templates = ide.getTemplates();
    templates.forEach(template => {
      console.log(chalk.gray(`  - ${template.name}`));
    });
    
    console.log('');
    console.log(chalk.white('Features:'));
    console.log(chalk.gray('  ✓ Arduino C++ compilation'));
    console.log(chalk.gray('  ✓ AVR8js microcontroller emulation'));
    console.log(chalk.gray('  ✓ Real-time debugging'));
    console.log(chalk.gray('  ✓ Automated testing'));
    console.log(chalk.gray('  ✓ CI/CD integration'));
    console.log(chalk.gray('  ✓ Headless operation'));
  });

/**
 * Error handling and cleanup
 */
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n🛑 Received SIGINT, shutting down...'));
  ide.dispose();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n🛑 Received SIGTERM, shutting down...'));
  ide.dispose();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('💥 Uncaught exception:'), error);
  ide.dispose();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('💥 Unhandled rejection:'), reason);
  ide.dispose();
  process.exit(1);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}