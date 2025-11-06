/**
 * CSV parsing utilities
 */

/**
 * Parse CSV content into rows
 * Handles quoted fields with embedded commas and escaped quotes
 * @param {string} csvContent - The CSV content to parse
 * @returns {Array<Array<string>>} Array of rows, each row is an array of fields
 */
export function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
  const rows = [];

  for (const line of lines) {
    const row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          field += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        row.push(field);
        field = '';
      } else {
        field += char;
      }
    }

    // Add last field
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/**
 * Escape CSV field (handle quotes and commas)
 * @param {*} field - The field value to escape
 * @returns {string} Escaped CSV field
 */
export function escapeCSV(field) {
  if (field == null || field === '') return '';
  const str = String(field);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

