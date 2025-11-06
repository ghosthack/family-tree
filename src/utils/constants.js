/**
 * Shared constants used across the application
 */

/**
 * Month names mapping for GEDCOM dates (0-based for JavaScript Date objects)
 * Use this when working with Date objects
 */
export const MONTH_MAP_ZERO_BASED = {
  'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
  'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
};

/**
 * Month names mapping for display (1-based)
 * Use this for GEDCOM output or display purposes
 */
export const MONTH_MAP_ONE_BASED = {
  'JAN': 1, 'FEB': 2, 'MAR': 3, 'APR': 4, 'MAY': 5, 'JUN': 6,
  'JUL': 7, 'AUG': 8, 'SEP': 9, 'OCT': 10, 'NOV': 11, 'DEC': 12
};

/**
 * Month names array (for converting month number to name)
 * Index 0 is empty, 1-12 are month names
 */
export const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Month abbreviations array for GEDCOM (0-based, for use with Date.getMonth())
 */
export const GEDCOM_MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/**
 * Parser buffer size constants
 */
export const BUFFER_SIZES = {
  /** Size of header preview for encoding detection (bytes) */
  HEADER_PREVIEW: 1000,
  /** Maximum bytes to scan for ANSEL detection */
  ANSEL_SCAN_LIMIT: 10000
};

/**
 * Tree traversal constants
 */
export const TREE_LIMITS = {
  /** Maximum depth for tree/ancestor commands to prevent performance issues */
  MAX_TREE_DEPTH: 20
};

