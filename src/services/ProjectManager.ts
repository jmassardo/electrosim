/**
 * Comprehensive Project Manager
 * Handles all project operations including save/load, templates, auto-save, and recent projects
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';
import {
  ElectroSimProject,
  ProjectReference,
  ProjectTemplate,
  AutoSaveConfig,
  RecoveryFile,
  ArduinoExportConfig,
  PROJECT_FORMAT_VERSION,
  PROJECT_FILE_EXTENSION,
  RECOVERY_FILE_EXTENSION,
  BACKUP_FILE_EXTENSION,
  DEFAULT_AUTO_SAVE_CONFIG,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_CANVAS_SETTINGS,
} from '../models/Project';
import { ProjectSerializer } from './ProjectSerializer';
import { ArduinoIDEExporter } from './ArduinoIDEExporter';

export interface ProjectManagerEvents {
  'project-changed': (project: ElectroSimProject | null) => void;
  'project-saved': (filePath: string) => void;
  'project-loaded': (project: ElectroSimProject, filePath: string) => void;
  'auto-save': (project: ElectroSimProject) => void;
  'recovery-available': (recoveryFiles: RecoveryFile[]) => void;
  'error': (error: Error) => void;
}

export class ProjectManager extends EventEmitter {
  private currentProject: ElectroSimProject | null = null;
  private currentFilePath: string | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private lastSaveTime: Date | null = null;
  private autoSaveConfig: AutoSaveConfig;
  private recentProjects: ProjectReference[] = [];
  private projectSerializer: ProjectSerializer;
  private arduinoExporter: ArduinoIDEExporter;

  // Paths
  private userDataPath: string;
  private recoveryPath: string;
  private templatesPath: string;
  private recentProjectsPath: string;

  constructor() {
    super();
    
    this.projectSerializer = new ProjectSerializer();
    this.arduinoExporter = new ArduinoIDEExporter();
    
    // Initialize paths
    this.userDataPath = app.getPath('userData');
    this.recoveryPath = path.join(this.userDataPath, 'recovery');
    this.templatesPath = path.join(this.userDataPath, 'templates');
    this.recentProjectsPath = path.join(this.userDataPath, 'recent-projects.json');
    
    this.autoSaveConfig = {
      ...DEFAULT_AUTO_SAVE_CONFIG,
      recoveryPath: this.recoveryPath,
    };

    this.initializeDirectories();
    this.loadRecentProjects();
    this.checkForRecoveryFiles();
  }

  /**
   * Create a new project
   */
  async createNewProject(name: string, template?: string): Promise<ElectroSimProject> {
    try {
      let project: ElectroSimProject;

      if (template) {
        project = await this.createFromTemplate(name, template);
      } else {
        project = this.createEmptyProject(name);
      }

      this.setCurrentProject(project, null);
      this.emit('project-changed', project);

      return project;
    } catch (error) {
      const err = new Error(`Failed to create new project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Load a project from file
   */
  async loadProject(filePath: string): Promise<ElectroSimProject> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const project = this.projectSerializer.deserialize(content);

      this.setCurrentProject(project, filePath);
      this.addToRecentProjects(filePath, project);
      this.emit('project-loaded', project, filePath);
      this.emit('project-changed', project);

      return project;
    } catch (error) {
      const err = new Error(`Failed to load project from ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Save the current project
   */
  async saveProject(filePath?: string): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No current project to save');
    }

    const targetPath = filePath || this.currentFilePath;
    if (!targetPath) {
      throw new Error('No file path specified for save');
    }

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(targetPath), { recursive: true });

      // Create backup if file exists
      const fileExists = await this.fileExists(targetPath);
      if (fileExists && targetPath === this.currentFilePath) {
        await this.createBackup(targetPath);
      }

      // Serialize and save
      const serialized = this.projectSerializer.serialize(this.currentProject);
      await fs.writeFile(targetPath, serialized, 'utf-8');

      // Update state
      this.currentFilePath = targetPath;
      this.isDirty = false;
      this.lastSaveTime = new Date();

      // Add to recent projects
      this.addToRecentProjects(targetPath, this.currentProject);

      this.emit('project-saved', targetPath);
    } catch (error) {
      const err = new Error(`Failed to save project to ${targetPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Export project to Arduino IDE format
   */
  async exportToArduinoIDE(
    outputPath: string, 
    config: Partial<ArduinoExportConfig> = {}
  ): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No current project to export');
    }

    try {
      await this.arduinoExporter.exportProject(this.currentProject, outputPath, config);
    } catch (error) {
      const err = new Error(`Failed to export to Arduino IDE: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Setup auto-save functionality
   */
  setupAutoSave(config: Partial<AutoSaveConfig> = {}): void {
    // Clear existing auto-save
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Update configuration
    this.autoSaveConfig = { ...this.autoSaveConfig, ...config };

    if (!this.autoSaveConfig.enabled) {
      return;
    }

    // Setup new auto-save interval
    this.autoSaveInterval = setInterval(async () => {
      await this.performAutoSave();
    }, this.autoSaveConfig.intervalMs);
  }

  /**
   * Get recent projects list
   */
  getRecentProjects(): ProjectReference[] {
    return [...this.recentProjects];
  }

  /**
   * Clear recent projects list
   */
  clearRecentProjects(): void {
    this.recentProjects = [];
    this.saveRecentProjects();
  }

  /**
   * Remove a project from recent projects
   */
  removeFromRecentProjects(filePath: string): void {
    this.recentProjects = this.recentProjects.filter(ref => ref.path !== filePath);
    this.saveRecentProjects();
  }

  /**
   * Get available project templates
   */
  async getProjectTemplates(): Promise<ProjectTemplate[]> {
    try {
      // First, ensure built-in templates exist
      await this.ensureBuiltinTemplates();

      // Load all template files
      const templateFiles = await fs.readdir(this.templatesPath);
      const templates: ProjectTemplate[] = [];

      for (const file of templateFiles) {
        if (file.endsWith('.json')) {
          try {
            const templatePath = path.join(this.templatesPath, file);
            const content = await fs.readFile(templatePath, 'utf-8');
            const template = JSON.parse(content) as ProjectTemplate;
            templates.push(template);
          } catch (error) {
            console.warn(`Failed to load template ${file}:`, error);
          }
        }
      }

      return templates.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Failed to get project templates:', error);
      return [];
    }
  }

  /**
   * Create a custom template from current project
   */
  async createTemplate(
    templateId: string,
    name: string,
    description: string,
    category: string = 'custom',
    difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ProjectTemplate> {
    if (!this.currentProject) {
      throw new Error('No current project to create template from');
    }

    const template: ProjectTemplate = {
      id: templateId,
      name,
      description,
      category,
      difficulty,
      tags: this.currentProject.metadata.tags,
      project: {
        circuit: this.currentProject.circuit,
        code: this.currentProject.code,
        settings: this.currentProject.settings,
        version: this.currentProject.version,
      },
    };

    // Save template
    const templatePath = path.join(this.templatesPath, `${templateId}.json`);
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2));

    return template;
  }

  /**
   * Check for recovery files and emit event if found
   */
  async checkForRecoveryFiles(): Promise<RecoveryFile[]> {
    try {
      const recoveryFiles = await this.findRecoveryFiles();
      if (recoveryFiles.length > 0) {
        this.emit('recovery-available', recoveryFiles);
      }
      return recoveryFiles;
    } catch (error) {
      console.warn('Failed to check for recovery files:', error);
      return [];
    }
  }

  /**
   * Recover project from recovery file
   */
  async recoverProject(recoveryFile: RecoveryFile): Promise<ElectroSimProject> {
    try {
      const content = await fs.readFile(recoveryFile.filePath, 'utf-8');
      const project = this.projectSerializer.deserialize(content);

      // Set as current project
      this.setCurrentProject(project, null);
      this.emit('project-changed', project);

      return project;
    } catch (error) {
      const err = new Error(`Failed to recover project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Delete a recovery file
   */
  async deleteRecoveryFile(recoveryFile: RecoveryFile): Promise<void> {
    try {
      await fs.unlink(recoveryFile.filePath);
    } catch (error) {
      console.warn(`Failed to delete recovery file: ${error}`);
    }
  }

  /**
   * Get current project
   */
  getCurrentProject(): ElectroSimProject | null {
    return this.currentProject;
  }

  /**
   * Get current file path
   */
  getCurrentFilePath(): string | null {
    return this.currentFilePath;
  }

  /**
   * Check if current project has unsaved changes
   */
  isDirtyProject(): boolean {
    return this.isDirty;
  }

  /**
   * Mark current project as modified
   */
  markProjectDirty(): void {
    this.isDirty = true;
  }

  /**
   * Update current project
   */
  updateCurrentProject(updates: Partial<ElectroSimProject>): void {
    if (!this.currentProject) {
      return;
    }

    this.currentProject = {
      ...this.currentProject,
      ...updates,
      metadata: {
        ...this.currentProject.metadata,
        ...updates.metadata,
        modified: new Date(),
      },
    };

    this.isDirty = true;
    this.emit('project-changed', this.currentProject);
  }

  /**
   * Close current project
   */
  closeProject(): void {
    this.setCurrentProject(null, null);
    this.emit('project-changed', null);
  }

  // Private methods

  private setCurrentProject(project: ElectroSimProject | null, filePath: string | null): void {
    this.currentProject = project;
    this.currentFilePath = filePath;
    this.isDirty = false;
    this.lastSaveTime = filePath ? new Date() : null;
  }

  private createEmptyProject(name: string): ElectroSimProject {
    const now = new Date();
    const projectId = `project_${Date.now()}`;

    return {
      metadata: {
        name,
        description: '',
        author: 'ElectroSim User',
        created: now,
        modified: now,
        version: '1.0.0',
        tags: [],
      },
      circuit: {
        components: [],
        wires: [],
        boardType: 'uno',
        canvasSettings: { ...DEFAULT_CANVAS_SETTINGS },
      },
      code: {
        mainSketch: `// ${name} Arduino Sketch
// Generated by ElectroSim

void setup() {
  // Initialize serial communication
  Serial.begin(9600);
  
  // Add your setup code here
}

void loop() {
  // Add your main code here
  
  delay(1000);
}`,
        libraries: [],
        includes: [],
      },
      settings: { ...DEFAULT_PROJECT_SETTINGS },
      version: PROJECT_FORMAT_VERSION,
    };
  }

  private async createFromTemplate(name: string, templateId: string): Promise<ElectroSimProject> {
    const templates = await this.getProjectTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const now = new Date();
    return {
      metadata: {
        name,
        description: template.description,
        author: 'ElectroSim User',
        created: now,
        modified: now,
        version: '1.0.0',
        tags: template.tags,
      },
      circuit: { ...template.project.circuit },
      code: { ...template.project.code },
      settings: { ...template.project.settings },
      version: PROJECT_FORMAT_VERSION,
    };
  }

  private async performAutoSave(): Promise<void> {
    if (!this.currentProject || !this.isDirty || !this.autoSaveConfig.enabled) {
      return;
    }

    try {
      const autoSaveFileName = `${this.currentProject.metadata.name}_autosave_${Date.now()}${RECOVERY_FILE_EXTENSION}`;
      const autoSavePath = path.join(this.recoveryPath, autoSaveFileName);

      const serialized = this.projectSerializer.serialize(this.currentProject);
      await fs.writeFile(autoSavePath, serialized, 'utf-8');

      // Clean up old recovery files
      await this.cleanupRecoveryFiles();

      this.emit('auto-save', this.currentProject);
    } catch (error) {
      console.error('Auto-save failed:', error);
      this.emit('error', new Error(`Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  private async cleanupRecoveryFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.recoveryPath);
      const recoveryFiles = files
        .filter(file => file.endsWith(RECOVERY_FILE_EXTENSION))
        .map(file => path.join(this.recoveryPath, file));

      if (recoveryFiles.length > this.autoSaveConfig.maxRecoveryFiles) {
        // Sort by modification time and remove oldest files
        const fileStats = await Promise.all(
          recoveryFiles.map(async file => ({
            path: file,
            stat: await fs.stat(file),
          }))
        );

        fileStats.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());
        
        const filesToRemove = fileStats.slice(0, fileStats.length - this.autoSaveConfig.maxRecoveryFiles);
        await Promise.all(filesToRemove.map(file => fs.unlink(file.path)));
      }
    } catch (error) {
      console.warn('Failed to cleanup recovery files:', error);
    }
  }

  private async findRecoveryFiles(): Promise<RecoveryFile[]> {
    try {
      const files = await fs.readdir(this.recoveryPath);
      const recoveryFiles: RecoveryFile[] = [];

      for (const file of files) {
        if (file.endsWith(RECOVERY_FILE_EXTENSION)) {
          try {
            const filePath = path.join(this.recoveryPath, file);
            const stat = await fs.stat(filePath);
            const projectName = file.replace(/_autosave_\d+\.esp\.recovery$/, '');

            recoveryFiles.push({
              projectName,
              filePath,
              timestamp: stat.mtime,
              size: stat.size,
              isCorrupted: false, // TODO: Add corruption detection
            });
          } catch (error) {
            console.warn(`Failed to process recovery file ${file}:`, error);
          }
        }
      }

      return recoveryFiles.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.warn('Failed to find recovery files:', error);
      return [];
    }
  }

  private async addToRecentProjects(filePath: string, project: ElectroSimProject): Promise<void> {
    // Remove existing entry if present
    this.recentProjects = this.recentProjects.filter(ref => ref.path !== filePath);

    // Add to beginning of list
    this.recentProjects.unshift({
      name: project.metadata.name,
      path: filePath,
      lastOpened: new Date(),
      metadata: {
        description: project.metadata.description,
        author: project.metadata.author,
        tags: project.metadata.tags,
      },
    });

    // Limit to reasonable number of recent projects
    this.recentProjects = this.recentProjects.slice(0, 20);

    await this.saveRecentProjects();
  }

  private async loadRecentProjects(): Promise<void> {
    try {
      if (await this.fileExists(this.recentProjectsPath)) {
        const content = await fs.readFile(this.recentProjectsPath, 'utf-8');
        const data = JSON.parse(content, (key, value) => {
          // Convert date strings back to Date objects
          if (key === 'lastOpened' && typeof value === 'string') {
            return new Date(value);
          }
          return value;
        });
        this.recentProjects = data || [];
      }
    } catch (error) {
      console.warn('Failed to load recent projects:', error);
      this.recentProjects = [];
    }
  }

  private async saveRecentProjects(): Promise<void> {
    try {
      const data = JSON.stringify(this.recentProjects, null, 2);
      await fs.writeFile(this.recentProjectsPath, data, 'utf-8');
    } catch (error) {
      console.warn('Failed to save recent projects:', error);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}${BACKUP_FILE_EXTENSION}.${timestamp}`;

    try {
      await fs.copyFile(filePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.recoveryPath, { recursive: true });
      await fs.mkdir(this.templatesPath, { recursive: true });
    } catch (error) {
      console.error('Failed to initialize directories:', error);
    }
  }

  private async ensureBuiltinTemplates(): Promise<void> {
    // This method will be implemented when we create the templates
    // For now, it's a placeholder
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.removeAllListeners();
  }
}