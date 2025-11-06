import { parseGedcomDate } from '../utils/dateParser.js';

/**
 * Tree model - manages the genealogy tree data
 */
export class Tree {
  constructor(data) {
    this.header = data.header || {};
    this.individuals = data.individuals || new Map();
    this.families = data.families || new Map();
    this.notes = data.notes || new Map();
    this.submitters = data.submitters || new Map();
  }

  /**
   * Get individual by ID
   */
  getIndividual(id) {
    return this.individuals.get(id);
  }

  /**
   * Get family by ID
   */
  getFamily(id) {
    return this.families.get(id);
  }

  /**
   * Get note by ID
   */
  getNote(id) {
    return this.notes.get(id);
  }

  /**
   * Find individuals by name (fuzzy search)
   */
  findIndividualsByName(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const individual of this.individuals.values()) {
      const fullName = individual.name?.full?.toLowerCase() || '';
      const given = individual.name?.given?.toLowerCase() || '';
      const surname = individual.name?.surname?.toLowerCase() || '';

      if (
        fullName.includes(lowerQuery) ||
        given.includes(lowerQuery) ||
        surname.includes(lowerQuery)
      ) {
        results.push(individual);
      }
    }

    return results;
  }

  /**
   * Get all individuals
   */
  getAllIndividuals() {
    return Array.from(this.individuals.values());
  }

  /**
   * Get all families
   */
  getAllFamilies() {
    return Array.from(this.families.values());
  }

  /**
   * Get parents of an individual
   * @param {string} individualId - Individual ID
   * @param {Set} visited - Set of visited IDs to prevent circular references
   */
  getParents(individualId, visited = null) {
    const individual = this.getIndividual(individualId);
    if (!individual || !individual.familiesAsChild) return [];

    const parents = [];
    for (const familyId of individual.familiesAsChild) {
      const family = this.getFamily(familyId);
      if (family) {
        if (family.husband) {
          const father = this.getIndividual(family.husband);
          // Only add parent if not already visited (prevents circular references)
          if (father && (!visited || !visited.has(father.id))) {
            parents.push({ relation: 'father', individual: father });
          }
        }
        if (family.wife) {
          const mother = this.getIndividual(family.wife);
          // Only add parent if not already visited (prevents circular references)
          if (mother && (!visited || !visited.has(mother.id))) {
            parents.push({ relation: 'mother', individual: mother });
          }
        }
      }
    }
    return parents;
  }

  /**
   * Get children of an individual
   * @param {string} individualId - Individual ID
   * @param {Set} visited - Set of visited IDs to prevent circular references
   */
  getChildren(individualId, visited = null) {
    const individual = this.getIndividual(individualId);
    if (!individual || !individual.familiesAsSpouse) return [];

    const children = [];
    for (const familyId of individual.familiesAsSpouse) {
      const family = this.getFamily(familyId);
      if (family && family.children) {
        for (const childId of family.children) {
          const child = this.getIndividual(childId);
          // Only add child if not already visited (prevents circular references)
          if (child && (!visited || !visited.has(child.id))) {
            children.push(child);
          }
        }
      }
    }
    return children;
  }

  /**
   * Get spouses of an individual
   */
  getSpouses(individualId) {
    const individual = this.getIndividual(individualId);
    if (!individual || !individual.familiesAsSpouse) return [];

    const spouses = [];
    for (const familyId of individual.familiesAsSpouse) {
      const family = this.getFamily(familyId);
      if (family) {
        if (family.husband === individualId && family.wife) {
          const spouse = this.getIndividual(family.wife);
          if (spouse) spouses.push({ family: familyId, individual: spouse });
        } else if (family.wife === individualId && family.husband) {
          const spouse = this.getIndividual(family.husband);
          if (spouse) spouses.push({ family: familyId, individual: spouse });
        }
      }
    }
    return spouses;
  }

  /**
   * Get siblings of an individual
   */
  getSiblings(individualId) {
    const individual = this.getIndividual(individualId);
    if (!individual || !individual.familiesAsChild) return [];

    const siblings = [];
    for (const familyId of individual.familiesAsChild) {
      const family = this.getFamily(familyId);
      if (family && family.children) {
        for (const siblingId of family.children) {
          if (siblingId !== individualId) {
            const sibling = this.getIndividual(siblingId);
            if (sibling) siblings.push(sibling);
          }
        }
      }
    }
    return siblings;
  }

  /**
   * Get statistics about the tree
   */
  getStats() {
    const individuals = this.getAllIndividuals();
    const families = this.getAllFamilies();

    // Parse birth dates and extract years (supporting multiple calendar systems)
    let birthDates = individuals
      .map((i) => i.birth?.date)
      .filter(Boolean)
      .map((d) => parseGedcomDate(d))
      .filter(Boolean);

    // Parse death dates
    let deathDates = individuals
      .map((i) => i.death?.date)
      .filter(Boolean)
      .map((d) => parseGedcomDate(d))
      .filter(Boolean);

    // Group dates by calendar system for better statistics
    const birthsByCalendar = {};
    const deathsByCalendar = {};

    birthDates.forEach(date => {
      if (!birthsByCalendar[date.calendar]) {
        birthsByCalendar[date.calendar] = [];
      }
      birthsByCalendar[date.calendar].push(date.year);
    });

    deathDates.forEach(date => {
      if (!deathsByCalendar[date.calendar]) {
        deathsByCalendar[date.calendar] = [];
      }
      deathsByCalendar[date.calendar].push(date.year);
    });

    // Get overall earliest/latest (across all calendars - may not be meaningful for mixed calendars)
    const allBirthYears = birthDates.map(d => d.year);
    const allDeathYears = deathDates.map(d => d.year);

    return {
      totalIndividuals: this.individuals.size,
      totalFamilies: this.families.size,
      totalNotes: this.notes.size,
      maleCount: individuals.filter((i) => i.sex === 'M').length,
      femaleCount: individuals.filter((i) => i.sex === 'F').length,
      unknownGender: individuals.filter((i) => !i.sex || i.sex === 'U' || i.sex === '').length,
      earliestBirth: allBirthYears.length > 0 ? Math.min(...allBirthYears) : null,
      latestBirth: allBirthYears.length > 0 ? Math.max(...allBirthYears) : null,
      earliestDeath: allDeathYears.length > 0 ? Math.min(...allDeathYears) : null,
      latestDeath: allDeathYears.length > 0 ? Math.max(...allDeathYears) : null,
      birthsByCalendar,
      deathsByCalendar,
      calendars: Object.keys(birthsByCalendar).concat(Object.keys(deathsByCalendar)).filter((v, i, a) => a.indexOf(v) === i)
    };
  }

  /**
   * Get all root individuals (individuals without parent information)
   * @returns {Array} Array of individuals who don't have parents
   */
  getRootIndividuals() {
    const roots = [];
    
    for (const individual of this.individuals.values()) {
      // Check if individual has no familiesAsChild or if those families have no parents
      const hasParents = this.getParents(individual.id).length > 0;
      
      if (!hasParents) {
        roots.push(individual);
      }
    }
    
    return roots;
  }

  /**
   * Resolve note text from note reference
   */
  resolveNote(noteRef) {
    if (typeof noteRef === 'string' && noteRef.startsWith('@')) {
      const note = this.getNote(noteRef);
      return note?.text || noteRef;
    }
    return noteRef?.text || noteRef;
  }
}
