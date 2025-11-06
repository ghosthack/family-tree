import chalk from 'chalk';
import Table from 'cli-table3';
import { MONTH_MAP_ZERO_BASED, MONTH_MAP_ONE_BASED, MONTH_NAMES } from '../utils/constants.js';
import { escapeCSV } from '../utils/csvParser.js';

/**
 * Formatter - handles display of genealogy data
 */
export class Formatter {
  constructor(tree) {
    this.tree = tree;
  }

  /**
   * Get parent IDs for an individual
   */
  getParentIds(individual) {
    const parents = this.tree.getParents(individual.id);
    const father = parents.find(p => p.relation === 'father');
    const mother = parents.find(p => p.relation === 'mother');
    return {
      fatherId: father ? father.individual.id : '',
      motherId: mother ? mother.individual.id : ''
    };
  }

  /**
   * Get first spouse ID for an individual
   */
  getSpouseId(individual) {
    const spouses = this.tree.getSpouses(individual.id);
    return spouses.length > 0 ? spouses[0].individual.id : '';
  }

  /**
   * Calculate age from birth date
   * Returns current age if living, age at death if deceased
   */
  calculateAge(individual) {
    if (!individual.birth?.date) {
      return '';
    }

    // Parse the GEDCOM date format (e.g., "20 JUN 1979")
    const birthDateStr = individual.birth.date;
    const birthMatch = birthDateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);

    if (!birthMatch) {
      return ''; // Can't parse date
    }

    const [, day, month, year] = birthMatch;

    const birthDate = new Date(parseInt(year), MONTH_MAP_ZERO_BASED[month.toUpperCase()], parseInt(day));
    let endDate;

    // If deceased, calculate age at death
    if (individual.death?.date) {
      const deathDateStr = individual.death.date;
      const deathMatch = deathDateStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);

      if (deathMatch) {
        const [, dDay, dMonth, dYear] = deathMatch;
        endDate = new Date(parseInt(dYear), MONTH_MAP_ZERO_BASED[dMonth.toUpperCase()], parseInt(dDay));
      } else {
        return ''; // Can't parse death date
      }
    } else {
      // Living - use current date
      endDate = new Date();
    }

    // Calculate age
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = endDate.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birthDate.getDate())) {
      age--;
    }

    return age.toString();
  }

  /**
   * Format list of individuals as table
   */
  formatIndividualsList(individuals) {
    if (!individuals || individuals.length === 0) {
      return chalk.yellow('No individuals found.');
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Born'),
        chalk.cyan('Died'),
        chalk.cyan('Age'),
        chalk.cyan('Father'),
        chalk.cyan('Mother'),
        chalk.cyan('Spouse')
      ],
      colWidths: [12, null, 15, 15, 6, 12, 12, 12],
      wordWrap: true
    });

    for (const individual of individuals) {
      const name = individual.name?.full || chalk.gray('(no name)');
      const born = individual.birth?.date || '';
      const died = individual.death?.date || '';
      const age = this.calculateAge(individual);

      const { fatherId, motherId } = this.getParentIds(individual);
      const spouseId = this.getSpouseId(individual);

      table.push([
        individual.id,
        name,
        born,
        died,
        age,
        fatherId,
        motherId,
        spouseId
      ]);
    }

    return table.toString();
  }

  /**
   * Parse GEDCOM date to get month and day (ignoring year)
   */
  parseBirthdayDate(dateStr) {
    if (!dateStr) return null;

    // Parse GEDCOM date format (e.g., "20 JUN 1979")
    const match = dateStr.match(/(\d+)\s+(\w+)(?:\s+(\d{4}))?/);
    if (!match) return null;

    const [, day, month, year] = match;

    const monthNum = MONTH_MAP_ONE_BASED[month.toUpperCase()];
    if (!monthNum) return null;

    return {
      month: monthNum,
      day: parseInt(day),
      year: year ? parseInt(year) : null,
      originalDate: dateStr
    };
  }

  /**
   * Format list of individuals sorted by birthday (month/day)
   * @param {Array} individuals - Array of individuals to format
   * @param {boolean} showAll - If false (default), only show living people
   */
  formatIndividualsListByBirthday(individuals, showAll = false) {
    if (!individuals || individuals.length === 0) {
      return chalk.yellow('No individuals found.');
    }

    // Filter individuals with birth dates and parse them
    let individualsWithBirthdays = individuals
      .map(individual => ({
        individual,
        birthday: this.parseBirthdayDate(individual.birth?.date)
      }))
      .filter(item => item.birthday !== null);

    // Filter to only living people unless showAll is true
    if (!showAll) {
      individualsWithBirthdays = individualsWithBirthdays.filter(
        item => !item.individual.death?.date
      );
    }

    // Sort by month, then by day
    individualsWithBirthdays.sort((a, b) => {
      if (a.birthday.month !== b.birthday.month) {
        return a.birthday.month - b.birthday.month;
      }
      return a.birthday.day - b.birthday.day;
    });

    if (individualsWithBirthdays.length === 0) {
      const message = showAll
        ? 'No individuals with birth dates found.'
        : 'No living individuals with birth dates found. Use -a or --all to include deceased.';
      return chalk.yellow(message);
    }

    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Name'),
        chalk.cyan('Birthday'),
        chalk.cyan('Birth Year'),
        chalk.cyan('Age'),
        chalk.cyan('Status')
      ],
      colWidths: [12, null, 12, 12, 6, 10],
      wordWrap: true
    });

    for (const { individual, birthday } of individualsWithBirthdays) {
      const name = individual.name?.full || chalk.gray('(no name)');
      const birthdayStr = `${MONTH_NAMES[birthday.month]} ${birthday.day}`;
      const birthYear = birthday.year ? birthday.year.toString() : chalk.gray('unknown');
      const age = this.calculateAge(individual);
      const status = individual.death?.date ? chalk.red('deceased') : chalk.green('living');

      table.push([
        individual.id,
        name,
        birthdayStr,
        birthYear,
        age,
        status
      ]);
    }

    const title = showAll
      ? 'Birthdays - All (sorted by month and day):'
      : 'Birthdays - Living Only (sorted by month and day):';

    return chalk.bold.yellow(title + '\n') + table.toString();
  }

  /**
   * Format individual detail view
   */
  formatIndividualDetail(individual) {
    if (!individual) {
      return chalk.red('Individual not found.');
    }

    const lines = [];
    const separator = chalk.cyan('━'.repeat(60));

    lines.push(separator);
    lines.push(chalk.bold.cyan(`Individual: ${individual.id}`));
    lines.push(separator);
    lines.push('');

    // Basic info
    const name = individual.name?.full || chalk.gray('(no name)');
    lines.push(chalk.bold('Name:     ') + name);

    if (individual.sex) {
      const sexLabel = individual.sex === 'M' ? 'Male' : individual.sex === 'F' ? 'Female' : 'Unknown';
      lines.push(chalk.bold('Sex:      ') + sexLabel);
    }

    // Birth
    if (individual.birth?.date || individual.birth?.place) {
      const birthInfo = [individual.birth.date, individual.birth.place].filter(Boolean).join(' in ');
      lines.push(chalk.bold('Born:     ') + (birthInfo || chalk.gray('(unknown)')));
    }

    // Death
    if (individual.death?.date || individual.death?.place) {
      const deathInfo = [individual.death.date, individual.death.place].filter(Boolean).join(' in ');
      lines.push(chalk.bold('Died:     ') + (deathInfo || chalk.gray('(unknown)')));
    }

    // Baptism
    if (individual.baptism) {
      const baptismInfo = [individual.baptism.date, individual.baptism.note].filter(Boolean).join(' - ');
      if (baptismInfo) {
        lines.push(chalk.bold('Baptism:  ') + baptismInfo);
      }
    }

    // First Communion
    if (individual.firstCommunion) {
      const fcomInfo = [individual.firstCommunion.date, individual.firstCommunion.note]
        .filter(Boolean)
        .join(' - ');
      if (fcomInfo) {
        lines.push(chalk.bold('First Communion: ') + fcomInfo);
      }
    }

    lines.push('');

    // Graduations
    if (individual.graduations && individual.graduations.length > 0) {
      lines.push(chalk.bold.yellow('Graduations:'));
      for (const grad of individual.graduations) {
        const gradInfo = [grad.type, grad.date, grad.note].filter(Boolean).join(' - ');
        lines.push('  • ' + gradInfo);
      }
      lines.push('');
    }

    // Residences
    if (individual.residences && individual.residences.length > 0) {
      lines.push(chalk.bold.yellow('Residences:'));
      for (const res of individual.residences) {
        const addr = res.address?.line || '';
        const city = res.address?.city || '';
        const country = res.address?.country || '';
        const location = [addr, city, country].filter(Boolean).join(', ');
        const resInfo = [res.date, location].filter(Boolean).join(': ');
        lines.push('  • ' + resInfo);
      }
      lines.push('');
    }

    // Family as child
    if (individual.familiesAsChild && individual.familiesAsChild.length > 0) {
      lines.push(chalk.bold.yellow('Family as Child:'));
      for (const familyId of individual.familiesAsChild) {
        const family = this.tree.getFamily(familyId);
        if (family) {
          const father = family.husband ? this.tree.getIndividual(family.husband) : null;
          const mother = family.wife ? this.tree.getIndividual(family.wife) : null;

          const fatherName = father?.name?.full || chalk.gray('unknown');
          const motherName = mother?.name?.full || chalk.gray('unknown');

          lines.push(`  ${familyId}: Father: ${fatherName}, Mother: ${motherName}`);
        }
      }
      lines.push('');
    }

    // Families as spouse
    if (individual.familiesAsSpouse && individual.familiesAsSpouse.length > 0) {
      lines.push(chalk.bold.yellow('Families as Spouse:'));
      for (const familyId of individual.familiesAsSpouse) {
        const family = this.tree.getFamily(familyId);
        if (family) {
          const spouseId = family.husband === individual.id ? family.wife : family.husband;
          const spouse = spouseId ? this.tree.getIndividual(spouseId) : null;
          const spouseName = spouse?.name?.full || chalk.gray('unknown');

          lines.push(`  ${familyId} married to ${spouseName}`);

          if (family.marriage?.date || family.marriage?.place) {
            const marriageInfo = [family.marriage.date, family.marriage.place].filter(Boolean).join(' in ');
            lines.push(`    ${chalk.bold('Marriage:')} ${marriageInfo}`);
          }

          if (family.divorce?.date || family.divorce?.place) {
            const divorceInfo = [family.divorce.date, family.divorce.place].filter(Boolean).join(' in ');
            lines.push(`    ${chalk.bold('Divorce:')} ${divorceInfo}`);
          }

          if (family.numberOfChildren) {
            lines.push(`    Number of Children: ${family.numberOfChildren}`);
          }

          if (family.children && family.children.length > 0) {
            lines.push('    Children:');
            for (const childId of family.children) {
              const child = this.tree.getIndividual(childId);
              if (child) {
                const childName = child.name?.full || chalk.gray('(no name)');
                const lifespan =
                  child.birth?.date || child.death?.date
                    ? ` (${child.birth?.date || '?'}-${child.death?.date || '?'})`
                    : '';
                lines.push(`      - ${childId} ${childName}${lifespan}`);
              }
            }
          }

          // Family notes
          if (family.notes && family.notes.length > 0) {
            lines.push(`    ${chalk.bold('Family Notes:')}`);
            for (const note of family.notes) {
              const noteText = this.tree.resolveNote(note.ref || note.text);
              // Handle multi-line notes from CONT fields
              const noteLines = noteText.split('\n');
              for (const noteLine of noteLines) {
                lines.push(`      ${noteLine}`);
              }
            }
          }
        }
      }
      lines.push('');
    }

    // Notes
    if (individual.notes && individual.notes.length > 0) {
      lines.push(chalk.bold.yellow('Notes:'));
      for (const note of individual.notes) {
        const noteText = this.tree.resolveNote(note.ref || note.text);
        // Handle multi-line notes from CONT fields
        const noteLines = noteText.split('\n');
        for (const noteLine of noteLines) {
          lines.push('  ' + noteLine);
        }
      }
      lines.push('');
    }

    // Objects
    if (individual.objects && individual.objects.length > 0) {
      lines.push(chalk.bold.yellow('Objects:'));
      for (const obj of individual.objects) {
        lines.push('  • ' + obj.title);
      }
      lines.push('');
    }

    // Change date
    if (individual.changeDate?.date) {
      const changeInfo = [individual.changeDate.date, individual.changeDate.time].filter(Boolean).join(' ');
      lines.push(chalk.gray(`Last Modified: ${changeInfo}`));
    }

    return lines.join('\n');
  }

  /**
   * Format family detail view
   */
  formatFamilyDetail(family) {
    if (!family) {
      return chalk.red('Family not found.');
    }

    const lines = [];
    const separator = chalk.cyan('━'.repeat(60));

    lines.push(separator);
    lines.push(chalk.bold.cyan(`Family: ${family.id}`));
    lines.push(separator);
    lines.push('');

    // Husband
    if (family.husband) {
      const husband = this.tree.getIndividual(family.husband);
      const husbandName = husband?.name?.full || chalk.gray('unknown');
      lines.push(chalk.bold('Husband: ') + `${family.husband} ${husbandName}`);
    }

    // Wife
    if (family.wife) {
      const wife = this.tree.getIndividual(family.wife);
      const wifeName = wife?.name?.full || chalk.gray('unknown');
      lines.push(chalk.bold('Wife:    ') + `${family.wife} ${wifeName}`);
    }

    lines.push('');

    // Marriage
    if (family.marriage?.date || family.marriage?.place) {
      const marriageInfo = [family.marriage.date, family.marriage.place].filter(Boolean).join(' in ');
      lines.push(chalk.bold.yellow('Marriage: ') + marriageInfo);
    }

    // Divorce
    if (family.divorce?.date || family.divorce?.place) {
      const divorceInfo = [family.divorce.date, family.divorce.place].filter(Boolean).join(' in ');
      lines.push(chalk.bold.yellow('Divorce: ') + divorceInfo);
    }

    // Number of children
    if (family.numberOfChildren) {
      lines.push(chalk.bold('Number of Children: ') + family.numberOfChildren);
    }

    lines.push('');

    // Children
    if (family.children && family.children.length > 0) {
      lines.push(chalk.bold.yellow('Children:'));
      for (const childId of family.children) {
        const child = this.tree.getIndividual(childId);
        if (child) {
          const childName = child.name?.full || chalk.gray('(no name)');
          const lifespan =
            child.birth?.date || child.death?.date
              ? ` (${child.birth?.date || '?'}-${child.death?.date || '?'})`
              : '';
          lines.push(`  - ${childId} ${childName}${lifespan}`);
        }
      }
      lines.push('');
    }

    // Notes
    if (family.notes && family.notes.length > 0) {
      lines.push(chalk.bold.yellow('Notes:'));
      for (const note of family.notes) {
        const noteText = this.tree.resolveNote(note.ref || note.text);
        // Handle multi-line notes from CONT fields
        const noteLines = noteText.split('\n');
        for (const noteLine of noteLines) {
          lines.push('  ' + noteLine);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format tree view (ancestors/descendants)
   */
  formatTree(individualId, depth = 3, direction = 'descendants') {
    const individual = this.tree.getIndividual(individualId);
    if (!individual) {
      return chalk.red('Individual not found.');
    }

    const lines = [];
    const name = individual.name?.full || '(no name)';
    const lifespan =
      individual.birth?.date || individual.death?.date
        ? ` (${individual.birth?.date || '?'}-${individual.death?.date || '?'})`
        : '';

    lines.push(chalk.bold.cyan(name + lifespan));

    if (direction === 'descendants') {
      this.formatDescendants(individual, lines, depth, 0);
    } else {
      this.formatAncestors(individual, lines, depth, 0);
    }

    return lines.join('\n');
  }

  /**
   * Format descendants recursively
   */
  formatDescendants(individual, lines, maxDepth, currentDepth, parentPrefixes = [], visited = new Set()) {
    if (currentDepth >= maxDepth) return;
    
    // Prevent circular references
    if (visited.has(individual.id)) {
      return;
    }
    visited.add(individual.id);

    const children = this.tree.getChildren(individual.id, visited);
    if (children.length === 0) return;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const isLast = i === children.length - 1;

      // Build prefix with proper continuation lines
      let prefix = '';
      for (const p of parentPrefixes) {
        prefix += p;
      }
      prefix += isLast ? '└── ' : '├── ';

      const name = child.name?.full || '(no name)';
      const lifespan =
        child.birth?.date || child.death?.date ? ` (${child.birth?.date || '?'}-${child.death?.date || '?'})` : '';

      lines.push(prefix + chalk.green(name + lifespan));

      // Add continuation for children
      const newPrefixes = [...parentPrefixes, isLast ? '    ' : '│   '];
      this.formatDescendants(child, lines, maxDepth, currentDepth + 1, newPrefixes, visited);
    }
  }

  /**
   * Convert number to ordinal (1st, 2nd, 3rd, etc.)
   */
  getOrdinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Get generational label for ancestor
   */
  getGenerationalLabel(relation, generation) {
    const isFather = relation === 'father';

    if (generation === 0) {
      return relation; // father/mother
    } else if (generation === 1) {
      return isFather ? 'grandfather' : 'grandmother';
    } else if (generation === 2) {
      return isFather ? 'great-grandfather' : 'great-grandmother';
    } else {
      // For 3+: 2nd great-grandfather, 3rd great-grandfather, etc.
      // Generation 3 = 2nd great-grandfather (great-great = 2 greats)
      // Generation 4 = 3rd great-grandfather (great-great-great = 3 greats)
      const ordinal = this.getOrdinal(generation - 1);
      return isFather ? `${ordinal} great-grandfather` : `${ordinal} great-grandmother`;
    }
  }

  /**
   * Format ancestors recursively
   */
  formatAncestors(individual, lines, maxDepth, currentDepth, parentPrefixes = [], visited = new Set()) {
    if (currentDepth >= maxDepth) return;
    
    // Prevent circular references
    if (visited.has(individual.id)) {
      return;
    }
    visited.add(individual.id);

    const parents = this.tree.getParents(individual.id, visited);
    if (parents.length === 0) return;

    for (let i = 0; i < parents.length; i++) {
      const parent = parents[i];
      const isLast = i === parents.length - 1;

      // Build prefix with proper continuation lines
      let prefix = '';
      for (const p of parentPrefixes) {
        prefix += p;
      }
      prefix += isLast ? '└── ' : '├── ';

      const name = parent.individual.name?.full || '(no name)';
      const lifespan =
        parent.individual.birth?.date || parent.individual.death?.date
          ? ` (${parent.individual.birth?.date || '?'}-${parent.individual.death?.date || '?'})`
          : '';

      // Get generational label
      const label = this.getGenerationalLabel(parent.relation, currentDepth);

      lines.push(prefix + chalk.magenta(`${label}: ${name}${lifespan}`));

      // Add continuation for ancestors
      const newPrefixes = [...parentPrefixes, isLast ? '    ' : '│   '];
      this.formatAncestors(parent.individual, lines, maxDepth, currentDepth + 1, newPrefixes, visited);
    }
  }

  /**
   * Format statistics
   */
  formatStats(stats) {
    const lines = [];
    const separator = chalk.cyan('━'.repeat(60));

    lines.push(separator);
    lines.push(chalk.bold.cyan('Genealogy Tree Statistics'));
    lines.push(separator);
    lines.push('');

    lines.push(chalk.bold('Total Individuals: ') + chalk.green(stats.totalIndividuals));
    lines.push(chalk.bold('Total Families:    ') + chalk.green(stats.totalFamilies));
    lines.push(chalk.bold('Total Notes:       ') + chalk.green(stats.totalNotes));
    lines.push('');

    lines.push(chalk.bold('Gender Distribution:'));
    lines.push(`  Male:    ${chalk.blue(stats.maleCount)}`);
    lines.push(`  Female:  ${chalk.magenta(stats.femaleCount)}`);
    lines.push(`  Unknown: ${chalk.gray(stats.unknownGender)}`);
    lines.push('');

    if (stats.earliestBirth || stats.latestBirth) {
      lines.push(chalk.bold('Birth Date Range:'));
      if (stats.earliestBirth) {
        lines.push(`  Earliest: ${chalk.yellow(stats.earliestBirth)}`);
      }
      if (stats.latestBirth) {
        lines.push(`  Latest:   ${chalk.yellow(stats.latestBirth)}`);
      }
      lines.push('');
    }

    if (stats.earliestDeath || stats.latestDeath) {
      lines.push(chalk.bold('Death Date Range:'));
      if (stats.earliestDeath) {
        lines.push(`  Earliest: ${chalk.yellow(stats.earliestDeath)}`);
      }
      if (stats.latestDeath) {
        lines.push(`  Latest:   ${chalk.yellow(stats.latestDeath)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Format individuals list as CSV
   * @param {Array} individuals - Array of individuals to export
   * @param {Array} columns - Columns to include (default: name, birth, death, spouse, father, mother, birthplace)
   * @returns {string} CSV formatted string
   */
  formatIndividualsCSV(individuals, columns = ['name', 'birth', 'death', 'spouse', 'father', 'mother', 'birthplace']) {
    if (!individuals || individuals.length === 0) {
      return '';
    }

    const lines = [];
    
    // Create header row
    const headerMap = {
      'id': 'ID',
      'name': 'Name',
      'birth': 'Birth Date',
      'death': 'Death Date',
      'birthplace': 'Birth Place',
      'deathplace': 'Death Place',
      'spouse': 'Spouse ID',
      'father': 'Father ID',
      'mother': 'Mother ID',
      'age': 'Age',
      'sex': 'Sex'
    };

    const headers = columns.map(col => headerMap[col.toLowerCase()] || col);
    lines.push(headers.map(escapeCSV).join(','));

    // Add data rows
    for (const individual of individuals) {
      const row = [];
      
      for (const col of columns) {
        const colLower = col.toLowerCase();
        
        switch (colLower) {
          case 'id':
            row.push(individual.id || '');
            break;
          case 'name':
            row.push(individual.name?.full || '');
            break;
          case 'birth':
            row.push(individual.birth?.date || '');
            break;
          case 'death':
            row.push(individual.death?.date || '');
            break;
          case 'birthplace':
            row.push(individual.birth?.place || '');
            break;
          case 'deathplace':
            row.push(individual.death?.place || '');
            break;
          case 'spouse': {
            const spouseId = this.getSpouseId(individual);
            row.push(spouseId);
            break;
          }
          case 'father': {
            const { fatherId } = this.getParentIds(individual);
            row.push(fatherId);
            break;
          }
          case 'mother': {
            const { motherId } = this.getParentIds(individual);
            row.push(motherId);
            break;
          }
          case 'age':
            row.push(this.calculateAge(individual));
            break;
          case 'sex':
            row.push(individual.sex || '');
            break;
          default:
            row.push('');
        }
      }
      
      lines.push(row.map(escapeCSV).join(','));
    }

    return lines.join('\n');
  }
}
