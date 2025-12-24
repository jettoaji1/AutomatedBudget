// src/storage/GoogleDriveClient.ts

import { STORAGE_CONFIG } from './StorageConfig.js';

/**
 * Low-level Google Drive API client
 * Handles all direct interactions with Google Drive API.
 * 
 * Assumptions:
 * - User has already authenticated via Google OAuth
 * - Access token is available and valid
 * - All operations use Google Drive API v3
 * 
 * This client provides basic CRUD operations for files and folders.
 * Higher-level storage classes (UserStorage, etc.) use this client.
 */
export class GoogleDriveClient {
  private accessToken: string;
  private rootFolderId: string | null = null;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Initialize storage by ensuring root folder structure exists
   * Creates: /BudgetingApp/accounts, /BudgetingApp/categories, /BudgetingApp/periods
   */
  async initializeStorage(): Promise<void> {
    // Find or create root folder
    this.rootFolderId = await this.findOrCreateFolder(STORAGE_CONFIG.ROOT_FOLDER, null);
    
    console.log('Storage root folder:', {
      name: STORAGE_CONFIG.ROOT_FOLDER,
      id: this.rootFolderId,
  });

    // Create subfolders
    await this.findOrCreateFolder(STORAGE_CONFIG.ACCOUNTS_FOLDER, this.rootFolderId);
    await this.findOrCreateFolder(STORAGE_CONFIG.CATEGORIES_FOLDER, this.rootFolderId);
    await this.findOrCreateFolder(STORAGE_CONFIG.PERIODS_FOLDER, this.rootFolderId);
  }

  /**
   * Find or create a folder
   * @param folderName - Name of the folder
   * @param parentId - Parent folder ID (null for root)
   * @returns Folder ID
   */
  private async findOrCreateFolder(folderName: string, parentId: string | null): Promise<string> {
    // Search for existing folder
    const query = parentId
      ? `name='${folderName}' and '${parentId}' in parents and mimeType='${STORAGE_CONFIG.MIME_FOLDER}' and trashed=false`
      : `name='${folderName}' and mimeType='${STORAGE_CONFIG.MIME_FOLDER}' and trashed=false`;

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder if not found
    const metadata = {
      name: folderName,
      mimeType: STORAGE_CONFIG.MIME_FOLDER,
      ...(parentId && { parents: [parentId] })
    };

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    const createData = await createResponse.json();
    return createData.id;
  }

  /**
   * Get file ID by path relative to root folder
   * @param filePath - Path like "user.json" or "periods/abc-123.json"
   * @returns File ID or null if not found
   */
  async getFileId(filePath: string): Promise<string | null> {
    if (!this.rootFolderId) {
      await this.initializeStorage();
    }

    const parts = filePath.split('/');
    let currentParentId = this.rootFolderId!;

    // Navigate through folders
    for (let i = 0; i < parts.length - 1; i++) {
      const folderQuery = `name='${parts[i]}' and '${currentParentId}' in parents and mimeType='${STORAGE_CONFIG.MIME_FOLDER}' and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      
      const data = await response.json();
      if (!data.files || data.files.length === 0) {
        return null;
      }
      currentParentId = data.files[0].id;
    }

    // Find file in final folder
    const fileName = parts[parts.length - 1];
    const fileQuery = `name='${fileName}' and '${currentParentId}' in parents and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fileQuery)}&fields=files(id)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }

  /**
   * Read JSON file content
   * @param filePath - Path like "user.json" or "periods/abc-123.json"
   * @returns Parsed JSON object or null if file doesn't exist
   */
  async readFile<T>(filePath: string): Promise<T | null> {
    const fileId = await this.getFileId(filePath);
    if (!fileId) {
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to read file ${filePath}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Write JSON file content
   * Creates new file or updates existing file.
   * 
   * @param filePath - Path like "user.json" or "periods/abc-123.json"
   * @param content - Object to serialize as JSON
   */
  async writeFile<T>(filePath: string, content: T): Promise<void> {
    if (!this.rootFolderId) {
      await this.initializeStorage();
    }

    const existingFileId = await this.getFileId(filePath);
    const jsonContent = JSON.stringify(content, null, 2);

    if (existingFileId) {
      // Update existing file
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': STORAGE_CONFIG.MIME_JSON
          },
          body: jsonContent
        }
      );
    } else {
      // Create new file
      const parts = filePath.split('/');
      const fileName = parts[parts.length - 1];
      
      // Get parent folder ID
      let parentId = this.rootFolderId!;
      if (parts.length > 1) {
        const folderPath = parts.slice(0, -1).join('/');
        for (const folder of parts.slice(0, -1)) {
          parentId = await this.findOrCreateFolder(folder, parentId);
        }
      }

      const metadata = {
        name: fileName,
        mimeType: STORAGE_CONFIG.MIME_JSON,
        parents: [parentId]
      };

      // Use multipart upload
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        jsonContent +
        closeDelim;

      await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        }
      );
    }
  }

  /**
   * List all files in a folder
   * @param folderPath - Path like "periods" or "accounts"
   * @returns Array of file IDs
   */
  async listFiles(folderPath: string): Promise<string[]> {
    if (!this.rootFolderId) {
      await this.initializeStorage();
    }

    // Get folder ID
    const parts = folderPath.split('/');
    let currentParentId = this.rootFolderId!;

    for (const folder of parts) {
      const folderQuery = `name='${folder}' and '${currentParentId}' in parents and mimeType='${STORAGE_CONFIG.MIME_FOLDER}' and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${this.accessToken}` }
        }
      );
      
      const data = await response.json();
      if (!data.files || data.files.length === 0) {
        return [];
      }
      currentParentId = data.files[0].id;
    }

    // List files in folder
    const query = `'${currentParentId}' in parents and trashed=false`;
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      }
    );

    const data = await response.json();
    return data.files ? data.files.map((f: any) => f.id) : [];
  }
}
