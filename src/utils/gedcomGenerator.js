/**
 * GEDCOM file generation utilities
 */

import { GEDCOM_MONTH_ABBR } from './constants.js';

/**
 * Generate GEDCOM header
 * @returns {Array<string>} Array of GEDCOM header lines
 */
export function generateGedcomHeader() {
  const lines = [];
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = GEDCOM_MONTH_ABBR[now.getMonth()];
  const year = now.getFullYear();
  const date = `${day} ${month} ${year}`;

  lines.push('0 HEAD');
  lines.push('1 SOUR GED_CSV_Converter');
  lines.push('2 NAME GEDCOM Shell Navigator CSV Converter');
  lines.push('1 DEST ANY');
  lines.push(`1 DATE ${date}`);
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');

  return lines;
}

/**
 * Generate GEDCOM individual record
 * @param {Object} individual - Individual data object
 * @returns {Array<string>} Array of GEDCOM individual record lines
 */
export function generateGedcomIndividual(individual) {
  const lines = [];

  lines.push(`0 ${individual.id} INDI`);

  if (individual.name) {
    lines.push(`1 NAME ${individual.name}`);
  }

  if (individual.birth || individual.birthplace) {
    lines.push('1 BIRT');
    if (individual.birth) {
      lines.push(`2 DATE ${individual.birth}`);
    }
    if (individual.birthplace) {
      lines.push(`2 PLAC ${individual.birthplace}`);
    }
  }

  if (individual.death || individual.deathplace) {
    lines.push('1 DEAT');
    if (individual.death) {
      lines.push(`2 DATE ${individual.death}`);
    }
    if (individual.deathplace) {
      lines.push(`2 PLAC ${individual.deathplace}`);
    }
  }

  // Add FAMC (family as child) if has parents
  if (individual.familyAsChild) {
    lines.push(`1 FAMC ${individual.familyAsChild}`);
  }

  // Add FAMS (family as spouse) references
  if (individual.familiesAsSpouse && individual.familiesAsSpouse.length > 0) {
    for (const famId of individual.familiesAsSpouse) {
      lines.push(`1 FAMS ${famId}`);
    }
  }

  return lines;
}

/**
 * Generate GEDCOM family record
 * @param {Object} family - Family data object
 * @returns {Array<string>} Array of GEDCOM family record lines
 */
export function generateGedcomFamily(family) {
  const lines = [];

  lines.push(`0 ${family.id} FAM`);

  if (family.husband) {
    lines.push(`1 HUSB ${family.husband}`);
  }

  if (family.wife) {
    lines.push(`1 WIFE ${family.wife}`);
  }

  if (family.children && family.children.length > 0) {
    for (const childId of family.children) {
      lines.push(`1 CHIL ${childId}`);
    }
  }

  return lines;
}

/**
 * Auto-generate family records from individual relationships
 * @param {Array<Object>} individuals - Array of individual objects
 * @returns {Array<Object>} Array of generated family objects
 */
export function generateFamilyRecords(individuals) {
  const families = new Map();
  let familyCounter = 1;

  // Build Map for O(1) lookups instead of O(n) find operations
  const individualsMap = new Map();
  for (const ind of individuals) {
    individualsMap.set(ind.id, ind);
  }

  // Track spouse pairs to avoid duplicates
  const spousePairs = new Set();

  // First pass: Create families for spouse relationships
  for (const ind of individuals) {
    if (ind.spouse) {
      // Create a canonical key for this spouse pair (sorted to avoid duplicates)
      const pair = [ind.id, ind.spouse].sort().join('|');

      if (!spousePairs.has(pair)) {
        spousePairs.add(pair);

        const famId = `@F${familyCounter++}@`;
        const family = {
          id: famId,
          husband: null,
          wife: null,
          children: []
        };

        // Assign husband/wife (we don't have sex info, so just use first as husband)
        family.husband = ind.id;
        family.wife = ind.spouse;

        families.set(famId, family);

        // Track which family this individual belongs to as spouse
        if (!ind.familiesAsSpouse) {
          ind.familiesAsSpouse = [];
        }
        ind.familiesAsSpouse.push(famId);

        // Also add to spouse's family list
        const spouseInd = individualsMap.get(ind.spouse);
        if (spouseInd) {
          if (!spouseInd.familiesAsSpouse) {
            spouseInd.familiesAsSpouse = [];
          }
          spouseInd.familiesAsSpouse.push(famId);
        }
      }
    }
  }

  // Second pass: Find family for each child based on their parents
  const parentPairToFamily = new Map();

  for (const [famId, family] of families) {
    const key = [family.husband, family.wife].filter(Boolean).sort().join('|');
    if (key) {
      parentPairToFamily.set(key, famId);
    }
  }

  // Third pass: Add children to families or create new families for orphans
  for (const ind of individuals) {
    if (ind.father || ind.mother) {
      const parentKey = [ind.father, ind.mother].filter(Boolean).sort().join('|');

      let famId = parentPairToFamily.get(parentKey);

      if (!famId) {
        // Create new family for these parents
        famId = `@F${familyCounter++}@`;
        const family = {
          id: famId,
          husband: ind.father || null,
          wife: ind.mother || null,
          children: []
        };

        families.set(famId, family);
        parentPairToFamily.set(parentKey, famId);

        // Add FAMS to parents if they exist
        if (ind.father) {
          const fatherInd = individualsMap.get(ind.father);
          if (fatherInd) {
            if (!fatherInd.familiesAsSpouse) {
              fatherInd.familiesAsSpouse = [];
            }
            if (!fatherInd.familiesAsSpouse.includes(famId)) {
              fatherInd.familiesAsSpouse.push(famId);
            }
          }
        }

        if (ind.mother) {
          const motherInd = individualsMap.get(ind.mother);
          if (motherInd) {
            if (!motherInd.familiesAsSpouse) {
              motherInd.familiesAsSpouse = [];
            }
            if (!motherInd.familiesAsSpouse.includes(famId)) {
              motherInd.familiesAsSpouse.push(famId);
            }
          }
        }
      }

      // Add child to family
      const family = families.get(famId);
      if (family && !family.children.includes(ind.id)) {
        family.children.push(ind.id);
      }

      // Set FAMC for individual
      ind.familyAsChild = famId;
    }
  }

  return Array.from(families.values());
}

