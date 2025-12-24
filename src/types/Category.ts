// src/types/Category.ts

/**
 * Category entity
 * Represents a spending category with a monthly limit.
 * Stored in: categories/categories.json (array of all categories)
 * 
 * Categories are user-level and persist independently of periods.
 * Every transaction MUST belong to exactly one category.
 */
export interface Category {
  category_id: string;       // UUID format
  user_id: string;           // Foreign key to User
  name: string;              // e.g., "Groceries", "Transport"
  monthly_limit: number;     // Spending limit in account currency
  is_default: boolean;       // true only for "Other" category
  created_at: string;        // ISO 8601 timestamp
  archived_at: string | null; // ISO 8601 timestamp or null if active
}

/**
 * Container for all categories
 * This is the structure stored in categories/categories.json
 */
export interface CategoriesCollection {
  categories: Category[];
}

/**
 * Creates a new Category object
 */
export function createCategory(
  user_id: string,
  name: string,
  monthly_limit: number,
  is_default: boolean = false
): Category {
  return {
    category_id: crypto.randomUUID(),
    user_id,
    name,
    monthly_limit,
    is_default,
    created_at: new Date().toISOString(),
    archived_at: null
  };
}

/**
 * Creates the default "Other" category
 * This is used for all transactions that haven't been manually categorized
 */
export function createDefaultCategory(user_id: string): Category {
  return createCategory(user_id, "Other", 0, true);
}
