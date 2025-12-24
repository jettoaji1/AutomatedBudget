// src/storage/CategoryStorage.ts

import { GoogleDriveClient } from './GoogleDriveClient';
import { Category, CategoriesCollection, createCategory, createDefaultCategory } from '../types/Category';
import { STORAGE_CONFIG } from './StorageConfig';

/**
 * Category storage operations
 * Manages the single categories/categories.json file.
 * 
 * Key behaviors:
 * - All categories stored in one file as an array
 * - Categories are user-level (persist across periods)
 * - One default "Other" category always exists
 * - Categories can be archived but not deleted (for historical integrity)
 */
export class CategoryStorage {
  constructor(private driveClient: GoogleDriveClient) {}

  /**
   * Initialize categories for a new user
   * Creates the default "Other" category.
   * 
   * @param user_id - User ID
   * @returns Array containing the default category
   */
  async initializeCategories(user_id: string): Promise<Category[]> {
    const defaultCategory = createDefaultCategory(user_id);
    const collection: CategoriesCollection = {
      categories: [defaultCategory]
    };

    await this.driveClient.writeFile(STORAGE_CONFIG.CATEGORIES_FILE, collection);
    return collection.categories;
  }

  /**
   * Get all categories for a user
   * Returns empty array if no categories exist (shouldn't happen after setup)
   * 
   * @param user_id - User ID
   * @returns Array of Category objects
   */
  async getCategories(user_id: string): Promise<Category[]> {
    const collection = await this.driveClient.readFile<CategoriesCollection>(
      STORAGE_CONFIG.CATEGORIES_FILE
    );

    if (!collection) {
      return [];
    }

    // Filter to user's categories (though V1 only has one user)
    return collection.categories.filter(cat => cat.user_id === user_id);
  }

  /**
   * Get all active (non-archived) categories
   * 
   * @param user_id - User ID
   * @returns Array of active Category objects
   */
  async getActiveCategories(user_id: string): Promise<Category[]> {
    const allCategories = await this.getCategories(user_id);
    return allCategories.filter(cat => cat.archived_at === null);
  }

  /**
   * Get a specific category by ID
   * 
   * @param category_id - Category ID
   * @returns Category object or null if not found
   */
  async getCategory(category_id: string): Promise<Category | null> {
    const collection = await this.driveClient.readFile<CategoriesCollection>(
      STORAGE_CONFIG.CATEGORIES_FILE
    );

    if (!collection) {
      return null;
    }

    return collection.categories.find(cat => cat.category_id === category_id) || null;
  }

  /**
   * Get the default "Other" category
   * 
   * @param user_id - User ID
   * @returns Default Category object or null if not found
   */
  async getDefaultCategory(user_id: string): Promise<Category | null> {
    const categories = await this.getCategories(user_id);
    return categories.find(cat => cat.is_default) || null;
  }

  /**
   * Create a new category
   * 
   * @param user_id - User ID
   * @param name - Category name
   * @param monthly_limit - Spending limit
   * @returns Created Category object
   */
  async createCategory(
    user_id: string,
    name: string,
    monthly_limit: number
  ): Promise<Category> {
    const collection = await this.driveClient.readFile<CategoriesCollection>(
      STORAGE_CONFIG.CATEGORIES_FILE
    ) || { categories: [] };

    const newCategory = createCategory(user_id, name, monthly_limit, false);
    collection.categories.push(newCategory);

    await this.driveClient.writeFile(STORAGE_CONFIG.CATEGORIES_FILE, collection);
    return newCategory;
  }

  /**
   * Update an existing category
   * Used for changing name, limit, or archiving.
   * 
   * @param category - Category object with updated fields
   */
  async updateCategory(category: Category): Promise<void> {
    const collection = await this.driveClient.readFile<CategoriesCollection>(
      STORAGE_CONFIG.CATEGORIES_FILE
    );

    if (!collection) {
      throw new Error('Categories file not found');
    }

    const index = collection.categories.findIndex(
      cat => cat.category_id === category.category_id
    );

    if (index === -1) {
      throw new Error(`Category ${category.category_id} not found`);
    }

    collection.categories[index] = category;
    await this.driveClient.writeFile(STORAGE_CONFIG.CATEGORIES_FILE, collection);
  }

  /**
   * Archive a category
   * Categories are never deleted to maintain historical transaction integrity.
   * Archived categories are hidden from active use but transactions keep their links.
   * 
   * @param category_id - Category ID to archive
   */
  async archiveCategory(category_id: string): Promise<void> {
    const category = await this.getCategory(category_id);
    
    if (!category) {
      throw new Error(`Category ${category_id} not found`);
    }

    if (category.is_default) {
      throw new Error('Cannot archive the default "Other" category');
    }

    category.archived_at = new Date().toISOString();
    await this.updateCategory(category);
  }
}
