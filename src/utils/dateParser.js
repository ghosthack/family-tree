import { MONTH_MAP_ZERO_BASED } from './constants.js';

/**
 * Date parsing utilities that support multiple calendar systems
 * including standard Gregorian and fictional calendars (e.g., Dune's AG calendar)
 */

/**
 * Configuration for fictional date contexts
 * This allows users to set a "current date" for calculating ages in fictional universes
 */
let fictionalDateContext = null;

/**
 * Set a fictional date context for age calculations
 * @param {Object} context - { calendar: 'AG', year: 10191, month: 1, day: 1 }
 */
export function setFictionalDateContext(context) {
  if (!context) {
    fictionalDateContext = null;
    return;
  }

  // Validate context
  if (!context.calendar || typeof context.year !== 'number') {
    throw new Error('Fictional date context must have calendar and year');
  }

  fictionalDateContext = {
    calendar: context.calendar,
    year: context.year,
    month: context.month || 1,
    day: context.day || 1
  };
}

/**
 * Get the current fictional date context
 */
export function getFictionalDateContext() {
  return fictionalDateContext;
}

/**
 * Clear the fictional date context (return to real-world dates)
 */
export function clearFictionalDateContext() {
  fictionalDateContext = null;
}

/**
 * Parse a GEDCOM date string into a structured date object
 * Supports multiple formats:
 * - Standard GEDCOM: "20 JUN 1979"
 * - With modifiers: "ABT 10155 AG" or "BEF 1900"
 * - Fictional calendars: "10191 AG", "ABT 9900 AG"
 * 
 * @param {string} dateStr - The date string to parse
 * @returns {Object|null} - Parsed date object or null if unparseable
 */
export function parseGedcomDate(dateStr) {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Handle date modifiers (ABT, BEF, AFT, etc.)
  let modifier = null;
  let dateWithoutModifier = trimmed;
  
  const modifierMatch = trimmed.match(/^(ABT|ABOUT|BEF|BEFORE|AFT|AFTER|BET|BETWEEN|EST|ESTIMATED|CAL|CALCULATED)\s+(.+)$/i);
  if (modifierMatch) {
    modifier = modifierMatch[1].toUpperCase();
    dateWithoutModifier = modifierMatch[2];
  }

  // Detect calendar system by checking for calendar suffix
  const calendarMatch = dateWithoutModifier.match(/\s+([A-Z]{2,4})$/);
  let calendar = 'GREGORIAN'; // default
  let dateCore = dateWithoutModifier;

  if (calendarMatch) {
    const possibleCalendar = calendarMatch[1];
    // Check if it's NOT a month name (to avoid false positives)
    // Month names are 3 letters: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
    const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    if (!monthNames.includes(possibleCalendar)) {
      // It's a fictional calendar suffix (AG, BG, UC, SC, SD, etc.)
      calendar = possibleCalendar;
      dateCore = dateWithoutModifier.substring(0, dateWithoutModifier.length - possibleCalendar.length).trim();
    }
  }

  // Try to parse standard GEDCOM format: DAY MONTH YEAR (e.g., "20 JUN 1979")
  const standardMatch = dateCore.match(/^(\d+)\s+([A-Z]+)\s+(\d+)$/i);
  if (standardMatch) {
    const [, day, month, year] = standardMatch;
    const monthNum = MONTH_MAP_ZERO_BASED[month.toUpperCase()];
    
    if (monthNum !== undefined) {
      return {
        calendar,
        year: parseInt(year),
        month: monthNum + 1, // Convert to 1-based
        day: parseInt(day),
        modifier,
        original: dateStr
      };
    }
  }

  // Try to parse month-year format: MONTH YEAR (e.g., "JUN 1979")
  const monthYearMatch = dateCore.match(/^([A-Z]+)\s+(\d+)$/i);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const monthNum = MONTH_MAP_ZERO_BASED[month.toUpperCase()];
    
    if (monthNum !== undefined) {
      return {
        calendar,
        year: parseInt(year),
        month: monthNum + 1,
        day: 1, // Default to first of month
        modifier,
        original: dateStr
      };
    }
  }

  // Try to parse year only format: YEAR (e.g., "1979" or "10191")
  const yearMatch = dateCore.match(/^(\d+)$/);
  if (yearMatch) {
    return {
      calendar,
      year: parseInt(yearMatch[1]),
      month: 1, // Default to January
      day: 1, // Default to first of month
      modifier,
      original: dateStr
    };
  }

  // If we can't parse it, return null
  return null;
}

/**
 * Calculate the difference in years between two dates
 * Works with both real-world and fictional calendar dates
 * 
 * @param {Object} fromDate - Start date (birth date)
 * @param {Object} toDate - End date (death date or current date)
 * @returns {number|null} - Age in years, or null if calculation not possible
 */
export function calculateYearDifference(fromDate, toDate) {
  if (!fromDate || !toDate) return null;

  // Both dates must be from the same calendar system
  if (fromDate.calendar !== toDate.calendar) {
    return null;
  }

  // Simple year difference (could be enhanced with month/day precision)
  let age = toDate.year - fromDate.year;

  // Adjust if the birth month/day hasn't occurred yet in the end year
  if (toDate.month < fromDate.month || 
      (toDate.month === fromDate.month && toDate.day < fromDate.day)) {
    age--;
  }

  return age;
}

/**
 * Get the "current date" for age calculations
 * If a fictional date context is set, uses that; otherwise uses real-world current date
 * 
 * @param {string} calendar - The calendar system to get current date for
 * @returns {Object} - Current date object
 */
export function getCurrentDate(calendar = 'GREGORIAN') {
  // If there's a fictional context and it matches the requested calendar, use it
  if (fictionalDateContext && fictionalDateContext.calendar === calendar) {
    return fictionalDateContext;
  }

  // For fictional calendars without a context set, we can't determine "current" date
  if (calendar !== 'GREGORIAN') {
    return null;
  }

  // Use real-world current date for Gregorian calendar
  const now = new Date();
  return {
    calendar: 'GREGORIAN',
    year: now.getFullYear(),
    month: now.getMonth() + 1, // Convert to 1-based
    day: now.getDate()
  };
}

/**
 * Format a parsed date object back to a string for display
 * 
 * @param {Object} dateObj - Parsed date object
 * @param {boolean} includeCalendar - Whether to include calendar suffix
 * @returns {string} - Formatted date string
 */
export function formatParsedDate(dateObj, includeCalendar = true) {
  if (!dateObj) return '';

  const parts = [];

  if (dateObj.modifier) {
    parts.push(dateObj.modifier);
  }

  if (dateObj.day && dateObj.month) {
    parts.push(`${dateObj.day} ${getMonthName(dateObj.month)} ${dateObj.year}`);
  } else if (dateObj.month) {
    parts.push(`${getMonthName(dateObj.month)} ${dateObj.year}`);
  } else {
    parts.push(dateObj.year.toString());
  }

  if (includeCalendar && dateObj.calendar !== 'GREGORIAN') {
    parts.push(dateObj.calendar);
  }

  return parts.join(' ');
}

/**
 * Get month name from month number (1-based)
 */
function getMonthName(monthNum) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
                  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return months[monthNum - 1] || '';
}

/**
 * Extract calendar system from a date string
 * 
 * @param {string} dateStr - Date string
 * @returns {string} - Calendar system (e.g., 'GREGORIAN', 'AG')
 */
export function detectCalendar(dateStr) {
  if (!dateStr) return 'GREGORIAN';
  
  const parsed = parseGedcomDate(dateStr);
  return parsed ? parsed.calendar : 'GREGORIAN';
}

