// src/storage/UserStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient.js';
import { User, createUser } from '../types/User.js';
import { STORAGE_CONFIG } from './StorageConfig.js';

/**
 * User storage operations
 * Manages the single user.json file at root level.
 * 
 * Key behaviors:
 * - Only one user exists (single-user MVP)
 * - User is created on first run
 * - User ID is used as foreign key in all other entities
 */
export class UserStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Get the current user
   * Returns existing user or creates a new one if none exists.
   * 
   * @returns User object
   */
  async getOrCreateUser(): Promise<User> {
    const existingUser = await this.driveClient.readFile<User>(
      STORAGE_CONFIG.USER_FILE
    );

    if (existingUser) {
      return existingUser;
      console.log('user.json found -> reusing existing user');
    }

    // No user exists - create one
    console.log('user.json not found -> creating new user');
    const newUser = createUser();
    await this.driveClient.writeFile(STORAGE_CONFIG.USER_FILE, newUser);
    return newUser;
  }

  /**
   * Get existing user without creating
   * @returns User object or null if doesn't exist
   */
  async getUser(): Promise<User | null> {
    return await this.driveClient.readFile<User>(STORAGE_CONFIG.USER_FILE);
  }
}
