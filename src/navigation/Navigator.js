/**
 * Navigator - manages current position and navigation in the tree
 */
export class Navigator {
  constructor(tree) {
    this.tree = tree;
    this.currentPath = '/';
    this.currentIndividual = null;
    this.currentFamily = null;
    this.history = [];
  }

  /**
   * Get current context (individual or family)
   */
  getCurrentContext() {
    if (this.currentIndividual) {
      return {
        type: 'individual',
        data: this.currentIndividual
      };
    }
    if (this.currentFamily) {
      return {
        type: 'family',
        data: this.currentFamily
      };
    }
    return {
      type: 'root',
      data: null
    };
  }

  /**
   * Navigate to individual by ID or name
   */
  navigateToIndividual(idOrName) {
    // Try as ID first
    if (idOrName.startsWith('@')) {
      const individual = this.tree.getIndividual(idOrName);
      if (individual) {
        this.history.push({ type: 'individual', id: this.currentIndividual?.id });
        this.currentIndividual = individual;
        this.currentFamily = null;
        this.currentPath = `/individuals/${individual.id}`;
        return true;
      }
    }

    // Try as name
    const matches = this.tree.findIndividualsByName(idOrName);
    if (matches.length === 1) {
      this.history.push({ type: 'individual', id: this.currentIndividual?.id });
      this.currentIndividual = matches[0];
      this.currentFamily = null;
      this.currentPath = `/individuals/${matches[0].id}`;
      return true;
    } else if (matches.length > 1) {
      throw new Error(`Multiple matches found for "${idOrName}". Please use ID or be more specific.`);
    }

    return false;
  }

  /**
   * Navigate to family by ID
   */
  navigateToFamily(familyId) {
    const family = this.tree.getFamily(familyId);
    if (family) {
      this.history.push({ type: 'family', id: this.currentFamily?.id });
      this.currentFamily = family;
      this.currentIndividual = null;
      this.currentPath = `/families/${family.id}`;
      return true;
    }
    return false;
  }

  /**
   * Navigate to parent
   */
  navigateToParent() {
    if (this.currentIndividual) {
      const parents = this.tree.getParents(this.currentIndividual.id);
      if (parents.length > 0) {
        // Navigate to first parent (usually father)
        return this.navigateToIndividual(parents[0].individual.id);
      }
    }
    return false;
  }

  /**
   * Navigate back
   */
  navigateBack() {
    if (this.history.length > 0) {
      const prev = this.history.pop();
      if (prev.type === 'individual' && prev.id) {
        this.currentIndividual = this.tree.getIndividual(prev.id);
        this.currentFamily = null;
        this.currentPath = `/individuals/${prev.id}`;
      } else if (prev.type === 'family' && prev.id) {
        this.currentFamily = this.tree.getFamily(prev.id);
        this.currentIndividual = null;
        this.currentPath = `/families/${prev.id}`;
      } else {
        this.navigateToRoot();
      }
      return true;
    }
    return false;
  }

  /**
   * Navigate to root
   */
  navigateToRoot() {
    this.currentIndividual = null;
    this.currentFamily = null;
    this.currentPath = '/';
  }

  /**
   * Clear navigation history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get current working directory path
   */
  getPwd() {
    return this.currentPath;
  }

  /**
   * Get prompt string
   */
  getPrompt() {
    if (this.currentIndividual) {
      const name = this.currentIndividual.name?.full || 'Unknown';
      return `[${this.currentIndividual.id} ${name}]`;
    }
    if (this.currentFamily) {
      return `[Family ${this.currentFamily.id}]`;
    }
    return '[Root]';
  }

  /**
   * List items at current location
   */
  list() {
    if (this.currentIndividual) {
      // List family members
      return this.listIndividualContext();
    } else if (this.currentFamily) {
      // List family members
      return this.listFamilyContext();
    } else {
      // List all individuals
      return {
        type: 'individuals',
        items: this.tree.getAllIndividuals()
      };
    }
  }

  /**
   * List context for individual
   */
  listIndividualContext() {
    const items = [];

    // Parents
    const parents = this.tree.getParents(this.currentIndividual.id);
    items.push(...parents.map((p) => ({ ...p.individual, relation: p.relation })));

    // Spouses
    const spouses = this.tree.getSpouses(this.currentIndividual.id);
    items.push(...spouses.map((s) => ({ ...s.individual, relation: 'spouse' })));

    // Children
    const children = this.tree.getChildren(this.currentIndividual.id);
    items.push(...children.map((c) => ({ ...c, relation: 'child' })));

    // Siblings
    const siblings = this.tree.getSiblings(this.currentIndividual.id);
    items.push(...siblings.map((s) => ({ ...s, relation: 'sibling' })));

    return {
      type: 'relatives',
      items
    };
  }

  /**
   * List context for family
   */
  listFamilyContext() {
    const items = [];

    if (this.currentFamily.husband) {
      const husband = this.tree.getIndividual(this.currentFamily.husband);
      if (husband) items.push({ ...husband, relation: 'husband' });
    }

    if (this.currentFamily.wife) {
      const wife = this.tree.getIndividual(this.currentFamily.wife);
      if (wife) items.push({ ...wife, relation: 'wife' });
    }

    if (this.currentFamily.children) {
      for (const childId of this.currentFamily.children) {
        const child = this.tree.getIndividual(childId);
        if (child) items.push({ ...child, relation: 'child' });
      }
    }

    return {
      type: 'family_members',
      items
    };
  }
}
