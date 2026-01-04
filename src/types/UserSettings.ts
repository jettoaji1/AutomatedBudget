// src/types/UserSettings.ts

import { PeriodType } from './BudgetPeriod';

/**
 * User settings entity
 * Stores user preferences for period calculation and budgeting behavior.
 * Stored in: settings/settings.json
 */
export interface UserSettings {
  user_id: string;
  period_type: PeriodType;          // FIXED_DATE or INCOME_ANCHORED
  anchor_day: number;                // Day of month (1-31) for period calculation
  created_at: string;                // ISO 8601 timestamp
  updated_at: string;                // ISO 8601 timestamp
}

/**
 * Creates default UserSettings object
 * Defaults to FIXED_DATE starting on the 1st of each month
 */
export function createDefaultSettings(user_id: string): UserSettings {
  const now = new Date().toISOString();
  return {
    user_id,
    period_type: PeriodType.FIXED_DATE,
    anchor_day: 1,  // Default: 1st of each month
    created_at: now,
    updated_at: now,
  };
}
