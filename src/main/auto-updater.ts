import { BrowserWindow, dialog, shell } from 'electron';
import * as https from 'https';

interface UpdateInfo {
  version: string;
  downloadUrl: string;
  releaseNotes: string;
}

export class AutoUpdaterManager {
  private mainWindow: BrowserWindow | null = null;
  private updateAvailable = false;
  private currentVersion = '1.0.0'; // Should be read from package.json

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  private async checkForUpdatesOnGitHub(): Promise<UpdateInfo | null> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/your-username/simudino/releases/latest', // Update with actual repo
        method: 'GET',
        headers: {
          'User-Agent': 'Simudino-App',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            if (release.tag_name !== this.currentVersion) {
              resolve({
                version: release.tag_name,
                downloadUrl: release.assets[0]?.browser_download_url || '',
                releaseNotes: release.body || 'No release notes available.',
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Failed to parse release info:', error);
            resolve(null);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Failed to check for updates:', error);
        resolve(null);
      });

      req.end();
    });
  }

  private async showUpdateAvailableDialog(updateInfo: UpdateInfo): Promise<void> {
    if (!this.mainWindow) return;

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${updateInfo.version}) of Simudino is available.`,
      detail: 'Would you like to download it from GitHub?',
      buttons: ['Open GitHub', 'Later'],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      // Open the GitHub release page
      shell.openExternal(updateInfo.downloadUrl);
    }
  }

  public async checkForUpdates(): Promise<void> {
    try {
      console.log('Checking for updates...');
      const updateInfo = await this.checkForUpdatesOnGitHub();
      
      if (updateInfo) {
        console.log('Update available:', updateInfo.version);
        this.updateAvailable = true;
        await this.showUpdateAvailableDialog(updateInfo);
      } else {
        console.log('No updates available');
        this.updateAvailable = false;
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }

  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  public async showManualUpdateCheck(): Promise<void> {
    if (!this.mainWindow) return;

    await this.checkForUpdates();
    
    if (!this.updateAvailable) {
      await dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version of Simudino.',
        buttons: ['OK'],
      });
    }
  }
}