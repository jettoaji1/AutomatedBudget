// src/storage/SettingsStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient';
import { UserSettings, createDefaultSettings } from '../types/UserSettings';
import { STORAGE_CONFIG } from './StorageConfig';

/**
 * Settings storage operations
 * Manages the settings/settings.json file.
 * 
 * Key behaviors:
 * - One settings object per user
 * - Created with defaults on first access
 * - Updated when user changes period preferences
 */
export class SettingsStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Get user settings or create with defaults
   * 
   * @param user_id - User ID
   * @returns UserSettings object
   */
  async getOrCreateSettings(user_id: string): Promise<UserSettings> {
    const existing = await this.driveClient.readFile<UserSettings>(
      STORAGE_CONFIG.SETTINGS_FILE
    );

    if (existing) {
      return existing;
    }

    // No settings exist - create defaults
    const defaultSettings = createDefaultSettings(user_id);
    await this.driveClient.writeFile(STORAGE_CONFIG.SETTINGS_FILE, defaultSettings);
    return defaultSettings;
  }

  /**
   * Get settings without creating
   * 
   * @returns UserSettings object or null
   */
  async getSettings(): Promise<UserSettings | null> {
    return await this.driveClient.readFile<UserSettings>(
      STORAGE_CONFIG.SETTINGS_FILE
    );
  }

  /**
   * Update user settings
   * 
   * @param settings - Updated settings object
   */
  async updateSettings(settings: UserSettings): Promise<void> {
    settings.updated_at = new Date().toISOString();
    await this.driveClient.writeFile(STORAGE_CONFIG.SETTINGS_FILE, settings);
  }
}
