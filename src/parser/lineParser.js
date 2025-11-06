/**
 * Parses a single GEDCOM line into its components
 * Format: LEVEL [XREF] TAG [VALUE]
 * Example: 0 @I1@ INDI
 * Example: 1 NAME John /Doe/
 * Example: 2 DATE 1 JAN 1900
 */
export function parseLine(line) {
  if (!line || line.trim() === '') {
    return null;
  }

  const trimmed = line.trim();

  // Match GEDCOM line format: LEVEL [XREF] TAG [VALUE]
  const match = trimmed.match(/^(\d+)\s+(@\w+@\s+)?(\w+)(\s+(.*))?$/);

  if (!match) {
    // Handle lines that don't match standard format
    console.warn(`Warning: Could not parse line: ${line}`);
    return null;
  }

  const [, level, xref, tag, , value] = match;

  return {
    level: parseInt(level, 10),
    xref: xref ? xref.trim() : null,
    tag: tag,
    value: value ? value.trim() : ''
  };
}

/**
 * Extracts given name and surname from GEDCOM NAME value
 * Format: Given Names /Surname/
 * Example: "John Michael /Doe/" -> { given: "John Michael", surname: "Doe" }
 */
export function parseName(nameValue) {
  if (!nameValue) {
    return { full: '', given: '', surname: '' };
  }

  const match = nameValue.match(/^([^/]*?)\/([^/]*)\/(.*)?$/);

  if (match) {
    const [, given, surname, suffix] = match;
    return {
      full: nameValue.replace(/\//g, '').trim(),
      given: given.trim(),
      surname: surname.trim(),
      suffix: suffix ? suffix.trim() : ''
    };
  }

  // No slashes found, treat entire value as given name
  return {
    full: nameValue.trim(),
    given: nameValue.trim(),
    surname: '',
    suffix: ''
  };
}

/**
 * Cleans GEDCOM value by removing special characters
 */
export function cleanValue(value) {
  if (!value) return '';
  return value.trim();
}
