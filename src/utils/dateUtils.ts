// src/utils/dateUtils.ts

import { PeriodType } from '../types/BudgetPeriod';

/**
 * Date utility functions for budget period calculations
 * All dates are stored and handled in ISO 8601 format (YYYY-MM-DD)
 */

/**
 * Calculate the next budget period dates based on period type
 * 
 * @param currentDate - The reference date (usually today)
 * @param periodType - FIXED_DATE or INCOME_ANCHORED
 * @param anchorDate - The anchor date (day-of-month for FIXED_DATE, actual date for INCOME_ANCHORED)
 * @returns Object with start_date and end_date
 */
export function calculatePeriodDates(
  currentDate: Date,
  periodType: PeriodType,
  anchorDate: Date
): { start_date: string; end_date: string } {
  
  if (periodType === PeriodType.FIXED_DATE) {
    return calculateFixedDatePeriod(currentDate, anchorDate);
  } else {
    return calculateIncomeAnchoredPeriod(currentDate, anchorDate);
  }
}

/**
 * Calculate period for FIXED_DATE type
 * Period runs from a specific day each month (e.g., 15th to 15th)
 * 
 * @param currentDate - Current date
 * @param anchorDate - Contains the day-of-month to use
 * @returns Period dates
 */
function calculateFixedDatePeriod(
  currentDate: Date,
  anchorDate: Date
): { start_date: string; end_date: string } {
  
  const dayOfMonth = anchorDate.getDate();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  let startDate: Date;
  let endDate: Date;

  // Determine if we're in the current period or need to use previous/next
  if (currentDay >= dayOfMonth) {
    // Current period: this month's anchor day to next month's anchor day
    startDate = new Date(year, month, dayOfMonth);
    endDate = new Date(year, month + 1, dayOfMonth);
  } else {
    // We're before anchor day, so period is last month to this month
    startDate = new Date(year, month - 1, dayOfMonth);
    endDate = new Date(year, month, dayOfMonth);
  }

  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate)
  };
}

/**
 * Calculate period for INCOME_ANCHORED type
 * Period runs from the income date to the next income date
 * 
 * @param currentDate - Current date
 * @param anchorDate - The income date
 * @returns Period dates
 */
function calculateIncomeAnchoredPeriod(
  currentDate: Date,
  anchorDate: Date
): { start_date: string; end_date: string } {
  
  // For income-anchored, the anchor date IS the start date
  // End date is calculated based on the recurrence pattern
  
  // Assumption: Income is monthly on the same day
  // Similar logic to FIXED_DATE but using the full anchor date
  
  const dayOfMonth = anchorDate.getDate();
  const currentTime = currentDate.getTime();
  const anchorTime = anchorDate.getTime();

  let startDate: Date;
  let endDate: Date;

  // Find which period we're in
  if (currentTime >= anchorTime) {
    // We're at or after the anchor date
    startDate = new Date(anchorDate);
    // End is next month, same day
    endDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, dayOfMonth);
  } else {
    // We're before the anchor date - use previous period
    startDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() - 1, dayOfMonth);
    endDate = new Date(anchorDate);
  }

  return {
    start_date: formatDate(startDate),
    end_date: formatDate(endDate)
  };
}

/**
 * Format Date object as ISO 8601 date string (YYYY-MM-DD)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse ISO 8601 date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if a transaction date falls within a budget period
 * 
 * @param transactionDate - ISO date string
 * @param periodStart - ISO date string
 * @param periodEnd - ISO date string
 * @returns true if transaction is within period (inclusive start, exclusive end)
 */
export function isDateInPeriod(
  transactionDate: string,
  periodStart: string,
  periodEnd: string
): boolean {
  const txDate = parseDate(transactionDate);
  const start = parseDate(periodStart);
  const end = parseDate(periodEnd);

  // Inclusive start, exclusive end
  return txDate >= start && txDate < end;
}

/**
 * Get today's date as ISO string
 */
export function getTodayISO(): string {
  return formatDate(new Date());
}
