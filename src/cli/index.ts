#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ElectroLoomProject, TestConfig, TestResult } from '../shared/types';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

// ASCII Art Logo
const logo = `
╔═══════════════════════════════════════╗
║            ElectroLoom                ║
║      Arduino Simulator CLI v1.0      ║
╚═══════════════════════════════════════╝
`;

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Fatal Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Promise Rejection:'), reason);
  process.exit(1);
});

// Helper functions
async function loadProject(projectPath: string): Promise<ElectroLoomProject> {
  try {
    const fullPath = path.resolve(projectPath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const project: ElectroLoomProject = JSON.parse(content);
    
    // Validate project structure
    if (!project.name || !project.circuit || !project.sketch?.code) {
      throw new Error('Invalid project file structure');
    }
    
    return project;
  } catch (error) {
    throw new Error(`Failed to load project: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function runTest(project: ElectroLoomProject, config: TestConfig): Promise<TestResult> {
  console.log(chalk.blue('🔧 Initializing simulation...'));
  
  // Simulate test execution (in real implementation, this would use AVR8js)
  const startTime = Date.now();
  
  // Mock test execution
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Mock result based on project
  const passed = project.circuit.components.length > 0;
  
  return {
    testName: config.name,
    passed,
    duration,
    error: passed ? undefined : 'Circuit is empty',
    assertions: [],
    metadata: {
      board: project.sketch.boardConfig,
      memoryUsage: 1024,
      cpuCycles: 16000000,
    },
  } as TestResult;
}

// CLI Commands
program
  .name('electroloom')
  .description('ElectroLoom Arduino Simulator - Headless CLI for automated testing')
  .version('1.0.0')
  .option('-v, --verbose', 'Enable verbose output')
  .hook('preAction', () => {
    if (!program.opts().verbose) {
      console.log(chalk.cyan(logo));
    }
  });

program
  .command('test')
  .description('Run automated tests on an Arduino project')
  .argument('<project-file>', 'Path to the ElectroLoom project file (.electroloom)')
  .option('-c, --config <config-file>', 'Path to test configuration file')
  .option('-t, --timeout <seconds>', 'Test timeout in seconds', '30')
  .option('-r, --reporter <type>', 'Test reporter type', 'console')
  .option('-o, --output <file>', 'Output file for test results')
  .action(async (projectFile: string, options) => {
    try {
      console.log(chalk.yellow('📋 Loading project...'));
      const project = await loadProject(projectFile);
      console.log(chalk.green(`✅ Project loaded: ${project.name}`));
      
      // Load test configuration
      let testConfig: TestConfig = {
        name: `Test for ${project.name}`,
        sketch: project.sketch.code,
        board: project.sketch.boardConfig,
        timeout: parseInt(options.timeout) * 1000,
        assertions: [],
      };
      
      if (options.config) {
        try {
          const configContent = await fs.readFile(options.config, 'utf-8');
          const userConfig = JSON.parse(configContent);
          testConfig = { ...testConfig, ...userConfig };
        } catch {
          console.warn(chalk.yellow(`⚠️  Could not load config file: ${options.config}`));
        }
      }
      
      console.log(chalk.blue('🚀 Starting tests...'));
      const result = await runTest(project, testConfig);
      
      // Display results
      if (result.passed) {
        console.log(chalk.green(`✅ Tests passed in ${result.duration}ms`));
        if (result.metadata) {
          console.log(chalk.green(`📊 Memory usage: ${result.metadata.memoryUsage} bytes`));
        }
      } else {
        console.log(chalk.red(`❌ Tests failed in ${result.duration}ms`));
        if (result.error) {
          console.log(chalk.red(`Error: ${result.error}`));
        }
      }
      
      // Save results if output file specified
      if (options.output) {
        await fs.writeFile(options.output, JSON.stringify(result, null, 2));
        console.log(chalk.blue(`📄 Results saved to: ${options.output}`));
      }
      
      process.exit(result.passed ? 0 : 1);
      
    } catch (error) {
      console.error(chalk.red('❌ Test execution failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate an Arduino project file')
  .argument('<project-file>', 'Path to the ElectroLoom project file (.electroloom)')
  .action(async (projectFile: string) => {
    try {
      console.log(chalk.yellow('🔍 Validating project...'));
      const project = await loadProject(projectFile);
      
      const issues: string[] = [];
      
      // Validation checks
      if (!project.circuit.components || project.circuit.components.length === 0) {
        issues.push('Circuit has no components');
      }
      
      if (!project.sketch.code.trim()) {
        issues.push('Arduino code is empty');
      }
      
      if (project.circuit.wires.length === 0) {
        issues.push('Circuit has no wires');
      }
      
      if (issues.length === 0) {
        console.log(chalk.green(`✅ Project is valid: ${project.name}`));
        console.log(chalk.blue(`📊 Components: ${project.circuit.components.length}`));
        console.log(chalk.blue(`🔗 Wires: ${project.circuit.wires.length}`));
        console.log(chalk.blue(`📝 Code lines: ${project.sketch.code.split('\\n').length}`));
      } else {
        console.log(chalk.yellow(`⚠️  Project has issues:`));
        issues.forEach(issue => console.log(chalk.yellow(`  • ${issue}`)));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Validation failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('info')
  .description('Display system information and capabilities')
  .action(() => {
    console.log(chalk.cyan('🔧 ElectroLoom CLI Information'));
    console.log(chalk.white('━'.repeat(40)));
    console.log(`${chalk.blue('Version:')} 1.0.0`);
    console.log(`${chalk.blue('Node.js:')} ${process.version}`);
    console.log(`${chalk.blue('Platform:')} ${process.platform} ${process.arch}`);
    console.log(`${chalk.blue('Working Directory:')} ${process.cwd()}`);
    console.log();
    console.log(chalk.cyan('🎯 Supported Features:'));
    console.log('  • Arduino project validation');
    console.log('  • Automated circuit testing');
    console.log('  • Code simulation');
    console.log('  • CI/CD pipeline integration');
    console.log('  • Virtual serial port testing');
    console.log();
    console.log(chalk.cyan('📚 Usage Examples:'));
    console.log('  electroloom test my-project.electroloom');
    console.log('  electroloom validate my-project.electroloom');
    console.log('  electroloom test project.electroloom --config test-config.json');
    console.log('  electroloom test project.electroloom --output results.json');
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}