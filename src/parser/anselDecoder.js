import { BUFFER_SIZES } from '../utils/constants.js';

/**
 * ANSEL (ANSI Z39.47) to Unicode decoder
 * ANSEL uses combining characters for diacritics
 */

// ANSEL combining character mappings
const ANSEL_COMBINING = {
  0xE0: '\u0309', // hook above
  0xE1: '\u0300', // grave
  0xE2: '\u0301', // acute
  0xE3: '\u0302', // circumflex
  0xE4: '\u0303', // tilde
  0xE5: '\u0304', // macron
  0xE6: '\u0306', // breve
  0xE7: '\u0307', // dot above
  0xE8: '\u0308', // diaeresis (umlaut)
  0xE9: '\u030C', // caron
  0xEA: '\u030A', // ring above
  0xEB: '\u0327', // cedilla
  0xEC: '\u0328', // ogonek
  0xED: '\u0323', // dot below
  0xEE: '\u0324', // diaeresis below
  0xEF: '\u0325', // ring below
  0xF0: '\u031C', // half ring below left
  0xF1: '\u032E', // breve below
  0xF2: '\u0333', // double low line
  0xF3: '\u0323', // dot below
  0xF4: '\u0324', // diaeresis below
  0xF5: '\u0325', // ring below
  0xF6: '\u0326', // comma below
  0xF7: '\u0327', // cedilla
  0xF8: '\u0328', // ogonek
  0xF9: '\u032D', // circumflex below
  0xFA: '\u0331', // macron below (line below)
  0xFB: '\u032E', // breve below
  0xFC: '\u0323', // dot below
  0xFD: '\u0323', // dot below
  0xFE: '\u0313'  // comma above (reversed comma)
};

// Common precomposed characters for better compatibility
const ANSEL_PRECOMPOSED = {
  // Acute accent (E2)
  'e2a': 'á', 'e2A': 'Á',
  'e2e': 'é', 'e2E': 'É',
  'e2i': 'í', 'e2I': 'Í',
  'e2o': 'ó', 'e2O': 'Ó',
  'e2u': 'ú', 'e2U': 'Ú',
  'e2y': 'ý', 'e2Y': 'Ý',

  // Grave accent (E1)
  'e1a': 'à', 'e1A': 'À',
  'e1e': 'è', 'e1E': 'È',
  'e1i': 'ì', 'e1I': 'Ì',
  'e1o': 'ò', 'e1O': 'Ò',
  'e1u': 'ù', 'e1U': 'Ù',

  // Circumflex (E3)
  'e3a': 'â', 'e3A': 'Â',
  'e3e': 'ê', 'e3E': 'Ê',
  'e3i': 'î', 'e3I': 'Î',
  'e3o': 'ô', 'e3O': 'Ô',
  'e3u': 'û', 'e3U': 'Û',

  // Tilde (E4)
  'e4a': 'ã', 'e4A': 'Ã',
  'e4n': 'ñ', 'e4N': 'Ñ',
  'e4o': 'õ', 'e4O': 'Õ',

  // Umlaut/Diaeresis (E8)
  'e8a': 'ä', 'e8A': 'Ä',
  'e8e': 'ë', 'e8E': 'Ë',
  'e8i': 'ï', 'e8I': 'Ï',
  'e8o': 'ö', 'e8O': 'Ö',
  'e8u': 'ü', 'e8U': 'Ü',
  'e8y': 'ÿ',

  // Ring above (EA)
  'eaa': 'å', 'eaA': 'Å',

  // Cedilla (EB)
  'ebc': 'ç', 'ebC': 'Ç'
};

/**
 * Decode ANSEL encoded buffer to Unicode string
 */
export function decodeAnsel(buffer) {
  const result = [];
  let i = 0;

  while (i < buffer.length) {
    const byte = buffer[i];

    // Check if it's a combining character (0xE0-0xFE)
    if (byte >= 0xE0 && byte <= 0xFE && i + 1 < buffer.length) {
      const nextByte = buffer[i + 1];
      const nextChar = String.fromCharCode(nextByte);

      // Try precomposed character first (better compatibility)
      const key = byte.toString(16) + nextChar;
      if (ANSEL_PRECOMPOSED[key]) {
        result.push(ANSEL_PRECOMPOSED[key]);
        i += 2;
        continue;
      }

      // Fall back to combining characters
      const combining = ANSEL_COMBINING[byte];
      if (combining) {
        result.push(nextChar + combining);
        i += 2;
        continue;
      }
    }

    // Regular ASCII character
    if (byte < 0x80) {
      result.push(String.fromCharCode(byte));
    } else if (byte >= 0xA0) {
      // Extended ASCII characters in ANSEL
      result.push(String.fromCharCode(byte));
    }

    i++;
  }

  return result.join('');
}

/**
 * Check if buffer appears to be ANSEL encoded
 */
export function isAnsel(buffer) {
  // Look for ANSEL combining character bytes (E0-FE)
  for (let i = 0; i < Math.min(buffer.length, BUFFER_SIZES.ANSEL_SCAN_LIMIT); i++) {
    const byte = buffer[i];
    if (byte >= 0xE0 && byte <= 0xFE) {
      return true;
    }
  }
  return false;
}
