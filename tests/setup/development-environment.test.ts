/**
 * Development Environment Setup Tests
 * 
 * These tests validate that the development environment is properly configured
 * and all build/development tools are working correctly.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');

describe('Development Environment Setup', () => {
  beforeAll(() => {
    // Ensure we're in the correct directory
    process.chdir(PROJECT_ROOT);
  });

  describe('Project Structure', () => {
    test('should have all required configuration files', () => {
      const requiredFiles = [
        'package.json',
        'tsconfig.json',
        'jest.config.js',
        '.eslintrc.js',
        'webpack.main.config.js',
        'webpack.renderer.config.js',
        'webpack.preload.config.js',
        'webpack.cli.config.js'
      ];

      requiredFiles.forEach(file => {
        expect(fs.existsSync(path.join(PROJECT_ROOT, file))).toBe(true);
      });
    });

    test('should have all required source directories', () => {
      const requiredDirs = [
        'src',
        'src/main',
        'src/renderer',
        'src/preload',
        'src/simulation',
        'src/shared',
        'src/cli',
        'tests'
      ];

      requiredDirs.forEach(dir => {
        expect(fs.existsSync(path.join(PROJECT_ROOT, dir))).toBe(true);
      });
    });

    test('should have package.json with correct dependencies', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
      );

      // Check for essential dependencies
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
      
      // TypeScript should be in devDependencies
      expect(packageJson.devDependencies.typescript).toBeDefined();
      expect(packageJson.devDependencies.jest).toBeDefined();
      expect(packageJson.devDependencies.eslint).toBeDefined();
    });
  });

  describe('Build System', () => {
    test('should pass TypeScript compilation', () => {
      expect(() => {
        execSync('npm run type-check', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT 
        });
      }).not.toThrow();
    });

    test('should pass ESLint checks', () => {
      expect(() => {
        execSync('npm run lint', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT 
        });
      }).not.toThrow();
    });

    test('should build all webpack targets successfully', () => {
      expect(() => {
        execSync('npm run build', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT,
          timeout: 60000 // 60 second timeout for build
        });
      }).not.toThrow();
    });

    test('should have dist folder after build', () => {
      // Build should create dist folder
      if (!fs.existsSync(path.join(PROJECT_ROOT, 'dist'))) {
        execSync('npm run build', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT,
          timeout: 60000
        });
      }
      
      expect(fs.existsSync(path.join(PROJECT_ROOT, 'dist'))).toBe(true);
    });
  });

  describe('Testing Framework', () => {
    test('should run Jest tests successfully', () => {
      expect(() => {
        execSync('npm test -- --passWithNoTests', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT 
        });
      }).not.toThrow();
    });

    test('should generate test coverage reports', () => {
      expect(() => {
        execSync('npm run test:coverage -- --passWithNoTests', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT 
        });
      }).not.toThrow();
    });

    test('should have Jest configuration with ts-jest', () => {
      const jestConfig = require(path.join(PROJECT_ROOT, 'jest.config.js'));
      
      expect(jestConfig.preset).toBe('ts-jest');
      expect(jestConfig.testEnvironment).toBe('jsdom');
      expect(jestConfig.transform).toBeDefined();
      expect(jestConfig.moduleNameMapper).toBeDefined();
    });
  });

  describe('TypeScript Configuration', () => {
    test('should have proper TypeScript configuration', () => {
      const tsConfig = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8')
      );

      expect(tsConfig.compilerOptions).toBeDefined();
      expect(tsConfig.compilerOptions.strict).toBe(true);
      expect(tsConfig.compilerOptions.target).toBeDefined();
      expect(tsConfig.compilerOptions.module).toBeDefined();
      expect(tsConfig.compilerOptions.paths).toBeDefined();
    });

    test('should resolve path aliases correctly', () => {
      const tsConfig = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'tsconfig.json'), 'utf8')
      );

      expect(tsConfig.compilerOptions.paths['@shared/*']).toEqual(['./src/shared/*']);
      expect(tsConfig.compilerOptions.paths['@renderer/*']).toEqual(['./src/renderer/*']);
      expect(tsConfig.compilerOptions.paths['@main/*']).toEqual(['./src/main/*']);
    });
  });

  describe('Development Scripts', () => {
    test('should have all required npm scripts', () => {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8')
      );

      const requiredScripts = [
        'dev',
        'build',
        'test',
        'lint',
        'type-check',
        'start'
      ];

      requiredScripts.forEach(script => {
        expect(packageJson.scripts[script]).toBeDefined();
      });
    });

    test('should validate webpack configurations exist and are valid', () => {
      const webpackConfigs = [
        'webpack.main.config.js',
        'webpack.renderer.config.js',
        'webpack.preload.config.js',
        'webpack.cli.config.js'
      ];

      webpackConfigs.forEach(configFile => {
        const configPath = path.join(PROJECT_ROOT, configFile);
        expect(fs.existsSync(configPath)).toBe(true);
        
        // Should be able to require the config without throwing
        expect(() => {
          require(configPath);
        }).not.toThrow();
      });
    });
  });

  describe('Code Quality', () => {
    test('should have ESLint configuration with TypeScript support', () => {
      const eslintConfigPath = path.join(PROJECT_ROOT, '.eslintrc.js');
      expect(fs.existsSync(eslintConfigPath)).toBe(true);
      
      const eslintConfig = require(eslintConfigPath);
      
      expect(eslintConfig.parser).toBe('@typescript-eslint/parser');
      expect(eslintConfig.extends).toContain('@typescript-eslint/recommended');
    });

    test('should enforce consistent code formatting', () => {
      // Check if there are any significant linting errors
      let lintOutput = '';
      try {
        execSync('npm run lint', { 
          stdio: 'pipe',
          cwd: PROJECT_ROOT 
        });
      } catch (error: any) {
        lintOutput = error.stdout?.toString() || '';
      }
      
      // Should not have critical errors (warnings are acceptable)
      expect(lintOutput).not.toContain('error');
    });
  });
});