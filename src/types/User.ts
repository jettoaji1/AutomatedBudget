// src/types/User.ts

import { randomUUID } from 'node:crypto';

/**
 * User entity
 * Represents the single user of the application.
 * Stored in: user.json at Drive root
 */
export interface User {
  user_id: string;           // UUID format
  created_at: string;        // ISO 8601 timestamp
}

/**
 * Creates a new User object with generated ID and current timestamp
 */
export function createUser(): User {
  return {
    user_id: randomUUID(),
    created_at: new Date().toISOString()
  };
}
