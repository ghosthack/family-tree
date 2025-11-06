import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parseCSV } from '../utils/csvParser.js';
import { generateGedcomHeader, generateGedcomIndividual, generateGedcomFamily, generateFamilyRecords } from '../utils/gedcomGenerator.js';
import { getGeneralHelp, getCommandHelp } from './HelpText.js';
import { TREE_LIMITS } from '../utils/constants.js';
import { setFictionalDateContext, getFictionalDateContext, clearFictionalDateContext } from '../utils/dateParser.js';

/**
 * Command handler for the shell
 */
export class Commands {
  constructor(navigator, formatter, app = null) {
    this.navigator = navigator;
    this.formatter = formatter;
    this.app = app;
  }

  /**
   * Execute a command
   */
  execute(input) {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const [command, ...args] = trimmed.split(/\s+/);

    try {
      switch (command.toLowerCase()) {
        case 'ls':
        case 'list':
          return this.ls(args);
        case 'cd':
          return this.cd(args);
        case 'pwd':
          return this.pwd();
        case 'show':
        case 'cat':
          return this.show(args);
        case 'tree':
          return this.tree(args);
        case 'ancestors':
          return this.ancestors(args);
        case 'parents':
          return this.parents();
        case 'children':
          return this.children();
        case 'siblings':
          return this.siblings();
        case 'spouses':
          return this.spouses();
        case 'roots':
          return this.roots(args);
        case 'find':
          return this.find(args);
        case 'stats':
          return this.stats();
        case 'export':
          return this.export(args);
        case 'convert':
          return this.convert(args);
        case 'reload':
          return this.reload();
        case 'help':
          return this.help(args);
        case 'setdate':
          return this.setDate(args);
        case 'showdate':
          return this.showDate();
        case 'cleardate':
          return this.clearDate();
        case 'clear':
        case 'cls':
          console.clear();
          return '';
        case 'exit':
        case 'quit':
          process.exit(0);
        default:
          return chalk.red(`Unknown command: ${command}. Type 'help' for available commands.`);
      }
    } catch (error) {
      return chalk.red(`Error: ${error.message}`);
    }
  }

  /**
   * List command - show items at current location
   */
  ls(args) {
    // Check for birthday sorting flag
    const hasBirthdayFlag = args.includes('--birthday') || args.includes('-b');
    // Check for show all flag (includes deceased)
    const showAll = args.includes('--all') || args.includes('-a');

    const result = this.navigator.list();

    if (result.type === 'individuals' || result.type === 'relatives' || result.type === 'family_members') {
      if (hasBirthdayFlag) {
        return this.formatter.formatIndividualsListByBirthday(result.items, showAll);
      }
      return this.formatter.formatIndividualsList(result.items);
    }

    return chalk.yellow('Nothing to list.');
  }

  /**
   * Change directory command
   */
  cd(args) {
    if (args.length === 0) {
      return chalk.red('Usage: cd <id|name|..|~|/>');
    }

    const target = args.join(' ');

    // Handle special cases
    if (target === '~' || target === '/') {
      this.navigator.navigateToRoot();
      return chalk.green('Navigated to root');
    }

    if (target === '..') {
      if (this.navigator.navigateBack()) {
        return chalk.green('Navigated back');
      } else {
        return chalk.yellow('Already at root');
      }
    }

    // Try to navigate to individual or family
    if (target.startsWith('@F')) {
      if (this.navigator.navigateToFamily(target)) {
        return chalk.green(`Navigated to family ${target}`);
      } else {
        return chalk.red(`Family not found: ${target}`);
      }
    } else {
      if (this.navigator.navigateToIndividual(target)) {
        const context = this.navigator.getCurrentContext();
        return chalk.green(`Navigated to ${context.data.name?.full || 'individual'}`);
      } else {
        return chalk.red(`Individual not found: ${target}`);
      }
    }
  }

  /**
   * Print working directory
   */
  pwd() {
    return this.navigator.getPwd();
  }

  /**
   * Show details of current or specified individual/family
   */
  show(args) {
    if (args.length > 0) {
      const target = args.join(' ');

      // Try individual first
      if (target.startsWith('@I')) {
        const individual = this.navigator.tree.getIndividual(target);
        return this.formatter.formatIndividualDetail(individual);
      } else if (target.startsWith('@F')) {
        const family = this.navigator.tree.getFamily(target);
        return this.formatter.formatFamilyDetail(family);
      } else {
        // Try by name
        const matches = this.navigator.tree.findIndividualsByName(target);
        if (matches.length === 1) {
          return this.formatter.formatIndividualDetail(matches[0]);
        } else if (matches.length > 1) {
          return chalk.yellow(`Multiple matches found:\n`) + this.formatter.formatIndividualsList(matches);
        } else {
          return chalk.red(`Not found: ${target}`);
        }
      }
    }

    // Show current context
    const context = this.navigator.getCurrentContext();
    if (context.type === 'individual') {
      return this.formatter.formatIndividualDetail(context.data);
    } else if (context.type === 'family') {
      return this.formatter.formatFamilyDetail(context.data);
    } else {
      return chalk.yellow('No current context. Use "cd" to navigate to an individual or family.');
    }
  }

  /**
   * Show tree view
   */
  tree(args) {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Tree view only available for individuals. Use "cd" to navigate to an individual.');
    }

    const depth = args[0] ? parseInt(args[0], 10) : 3;
    
    // Validate depth parameter
    if (isNaN(depth) || depth < 1) {
      return chalk.red('Depth must be a positive number');
    }
    if (depth > TREE_LIMITS.MAX_TREE_DEPTH) {
      return chalk.yellow(`Depth limited to ${TREE_LIMITS.MAX_TREE_DEPTH} for performance reasons. Using ${TREE_LIMITS.MAX_TREE_DEPTH}.`);
    }
    
    const validatedDepth = Math.min(depth, TREE_LIMITS.MAX_TREE_DEPTH);
    const direction = args[1] || 'descendants';

    return this.formatter.formatTree(context.data.id, validatedDepth, direction);
  }

  /**
   * Show ancestor tree from current individual upward
   */
  ancestors(args) {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Ancestors view only available for individuals. Use "cd" to navigate to an individual.');
    }

    const depth = args[0] ? parseInt(args[0], 10) : 3;
    
    // Validate depth parameter
    if (isNaN(depth) || depth < 1) {
      return chalk.red('Depth must be a positive number');
    }
    if (depth > TREE_LIMITS.MAX_TREE_DEPTH) {
      return chalk.yellow(`Depth limited to ${TREE_LIMITS.MAX_TREE_DEPTH} for performance reasons. Using ${TREE_LIMITS.MAX_TREE_DEPTH}.`);
    }
    
    const validatedDepth = Math.min(depth, TREE_LIMITS.MAX_TREE_DEPTH);

    return this.formatter.formatTree(context.data.id, validatedDepth, 'ancestors');
  }

  /**
   * Show parents of current individual
   */
  parents() {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Parents command only available for individuals.');
    }

    const parents = this.navigator.tree.getParents(context.data.id);
    if (parents.length === 0) {
      return chalk.yellow('No parents found.');
    }

    return this.formatter.formatIndividualsList(parents.map((p) => ({ ...p.individual, relation: p.relation })));
  }

  /**
   * Show children of current individual
   */
  children() {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Children command only available for individuals.');
    }

    const children = this.navigator.tree.getChildren(context.data.id);
    if (children.length === 0) {
      return chalk.yellow('No children found.');
    }

    return this.formatter.formatIndividualsList(children.map((c) => ({ ...c, relation: 'child' })));
  }

  /**
   * Show siblings of current individual
   */
  siblings() {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Siblings command only available for individuals.');
    }

    const siblings = this.navigator.tree.getSiblings(context.data.id);
    if (siblings.length === 0) {
      return chalk.yellow('No siblings found.');
    }

    return this.formatter.formatIndividualsList(siblings.map((s) => ({ ...s, relation: 'sibling' })));
  }

  /**
   * Show spouses of current individual
   */
  spouses() {
    const context = this.navigator.getCurrentContext();

    if (context.type !== 'individual') {
      return chalk.yellow('Spouses command only available for individuals.');
    }

    const spouses = this.navigator.tree.getSpouses(context.data.id);
    if (spouses.length === 0) {
      return chalk.yellow('No spouses found.');
    }

    return this.formatter.formatIndividualsList(spouses.map((s) => ({ ...s.individual, relation: 'spouse' })));
  }

  /**
   * Show all root individuals (individuals without parents)
   * Usage: roots [depth]
   * If depth is provided, shows descendant tree for each root
   */
  roots(args) {
    const roots = this.navigator.tree.getRootIndividuals();

    if (roots.length === 0) {
      return chalk.yellow('No root individuals found.');
    }

    // Check if depth parameter is provided
    if (args.length > 0) {
      const depth = parseInt(args[0], 10);
      
      // Validate depth parameter
      if (isNaN(depth) || depth < 1) {
        return chalk.red('Depth must be a positive number');
      }
      if (depth > TREE_LIMITS.MAX_TREE_DEPTH) {
        return chalk.yellow(`Depth limited to ${TREE_LIMITS.MAX_TREE_DEPTH} for performance reasons. Using ${TREE_LIMITS.MAX_TREE_DEPTH}.`);
      }
      
      const validatedDepth = Math.min(depth, TREE_LIMITS.MAX_TREE_DEPTH);
      
      // Generate tree view for each root individual
      const output = [chalk.green(`Found ${roots.length} root individual(s) (without parent information):\n`)];
      
      for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (i > 0) {
          output.push('\n' + chalk.cyan('─'.repeat(80)) + '\n');
        }
        output.push(this.formatter.formatTree(root.id, validatedDepth, 'descendants'));
      }
      
      return output.join('\n');
    }

    // Default: show list format
    return chalk.green(`Found ${roots.length} root individual(s) (without parent information):\n`) + 
           this.formatter.formatIndividualsList(roots);
  }

  /**
   * Find individuals by name
   */
  find(args) {
    if (args.length === 0) {
      return chalk.red('Usage: find <name>');
    }

    const query = args.join(' ');
    const results = this.navigator.tree.findIndividualsByName(query);

    if (results.length === 0) {
      return chalk.yellow(`No matches found for: ${query}`);
    }

    return chalk.green(`Found ${results.length} match(es):\n`) + this.formatter.formatIndividualsList(results);
  }

  /**
   * Show statistics
   */
  stats() {
    const stats = this.navigator.tree.getStats();
    return this.formatter.formatStats(stats);
  }

  /**
   * Export current list to CSV
   * Usage: export [filename] [--columns col1,col2,col3]
   * Default columns: id, name, birth, death, spouse, father, mother, birthplace
   */
  export(args) {
    // Get the current list
    const result = this.navigator.list();

    if (!result.items || result.items.length === 0) {
      return chalk.yellow('No data to export. Use "ls" or navigate to view data first.');
    }

    // Parse arguments
    let filename = 'gedcom_export.csv';
    let columns = ['id', 'name', 'birth', 'death', 'spouse', 'father', 'mother', 'birthplace'];
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '--columns' || arg === '-c') {
        // Next argument should be comma-separated column names
        if (i + 1 < args.length) {
          columns = args[i + 1].split(',').map(c => c.trim());
          i += 2;
        } else {
          return chalk.red('Error: --columns requires a comma-separated list of column names');
        }
      } else if (arg === '--path' || arg === '-p') {
        // Next argument should be the path
        if (i + 1 < args.length) {
          const pathArg = args[i + 1];
          filename = resolve(pathArg, filename);
          i += 2;
        } else {
          return chalk.red('Error: --path requires a directory path');
        }
      } else if (arg.startsWith('--') || arg.startsWith('-')) {
        return chalk.red(`Unknown option: ${arg}`);
      } else {
        // Assume it's the filename
        filename = arg;
        i++;
      }
    }

    // Resolve to absolute path if relative
    const filepath = resolve(filename);

    try {
      // Generate CSV content
      const csvContent = this.formatter.formatIndividualsCSV(result.items, columns);
      
      if (!csvContent) {
        return chalk.yellow('No data to export.');
      }

      // Write to file
      writeFileSync(filepath, csvContent, 'utf-8');

      return chalk.green(`✓ Exported ${result.items.length} individuals to: ${filepath}\n`) +
             chalk.gray(`  Columns: ${columns.join(', ')}`);
    } catch (error) {
      return chalk.red(`Export failed: ${error.message}`);
    }
  }

  /**
   * Reload the GEDCOM file
   */
  reload() {
    if (!this.app) {
      return chalk.red('Reload not available (app reference missing)');
    }

    try {
      this.app.reload();
      return chalk.green('✓ File reloaded successfully. Navigation reset to root.');
    } catch (error) {
      return chalk.red(`Failed to reload: ${error.message}`);
    }
  }

  /**
   * Show help
   */
  help(args) {
    if (args.length > 0) {
      return getCommandHelp(args[0]);
    }
    return getGeneralHelp();
  }


  /**
   * Set fictional date context for age calculations
   * Usage: setdate <calendar> <year> [month] [day]
   * Example: setdate AG 10191 1 1
   */
  setDate(args) {
    if (args.length < 2) {
      return chalk.red('Usage: setdate <calendar> <year> [month] [day]\n') +
             chalk.gray('Example: setdate AG 10191 1 1\n') +
             chalk.gray('This sets the "current date" for calculating ages in fictional universes.');
    }

    const calendar = args[0].toUpperCase();
    const year = parseInt(args[1], 10);
    const month = args.length > 2 ? parseInt(args[2], 10) : 1;
    const day = args.length > 3 ? parseInt(args[3], 10) : 1;

    if (isNaN(year) || (args.length > 2 && isNaN(month)) || (args.length > 3 && isNaN(day))) {
      return chalk.red('Invalid date values. Year, month, and day must be numbers.');
    }

    if (month < 1 || month > 12) {
      return chalk.red('Month must be between 1 and 12.');
    }

    if (day < 1 || day > 31) {
      return chalk.red('Day must be between 1 and 31.');
    }

    try {
      setFictionalDateContext({ calendar, year, month, day });
      return chalk.green(`✓ Fictional date context set to: ${calendar} ${year}/${month}/${day}\n`) +
             chalk.gray('Ages for living characters will now be calculated relative to this date.');
    } catch (error) {
      return chalk.red(`Failed to set date context: ${error.message}`);
    }
  }

  /**
   * Show current fictional date context
   */
  showDate() {
    const context = getFictionalDateContext();
    
    if (!context) {
      return chalk.yellow('No fictional date context set.\n') +
             chalk.gray('Using real-world current date for Gregorian calendars.\n') +
             chalk.gray('Use "setdate" to set a fictional date for age calculations.');
    }

    return chalk.cyan('Current Fictional Date Context:\n') +
           chalk.bold(`  Calendar: ${context.calendar}\n`) +
           chalk.bold(`  Date:     ${context.year}/${context.month}/${context.day}\n`) +
           chalk.gray('\nAges for living characters are calculated relative to this date.');
  }

  /**
   * Clear fictional date context
   */
  clearDate() {
    clearFictionalDateContext();
    return chalk.green('✓ Fictional date context cleared.\n') +
           chalk.gray('Returning to real-world current date for age calculations.');
  }

  /**
   * Convert CSV to GEDCOM
   * Usage: convert input.csv output.ged
   */
  convert(args) {
    if (args.length < 2) {
      return chalk.red('Usage: convert <input.csv> <output.ged>');
    }

    const inputFile = resolve(args[0]);
    const outputFile = resolve(args[1]);

    // Check if input file exists
    if (!existsSync(inputFile)) {
      return chalk.red(`Input file not found: ${inputFile}`);
    }

    try {
      // Read CSV file
      const csvContent = readFileSync(inputFile, 'utf-8');
      const rows = parseCSV(csvContent);

      if (rows.length < 2) {
        return chalk.red('CSV file is empty or has no data rows');
      }

      // Parse header
      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      // Validate required columns
      const requiredColumns = ['id', 'name'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length > 0) {
        return chalk.red(`CSV missing required columns: ${missingColumns.join(', ')}`);
      }

      // Map column indices
      const columnMap = {};
      headers.forEach((header, index) => {
        columnMap[header] = index;
      });

      // Parse individuals from CSV
      const individuals = [];

      for (const row of dataRows) {
        // Skip empty rows
        if (!row.some(cell => cell.trim())) {
          continue;
        }

        const individual = {
          id: row[columnMap['id']] || '',
          name: row[columnMap['name']] || '',
          birth: columnMap['birth date'] !== undefined ? row[columnMap['birth date']] || '' : '',
          death: columnMap['death date'] !== undefined ? row[columnMap['death date']] || '' : '',
          birthplace: columnMap['birth place'] !== undefined ? row[columnMap['birth place']] || '' : '',
          deathplace: columnMap['death place'] !== undefined ? row[columnMap['death place']] || '' : '',
          spouse: columnMap['spouse id'] !== undefined ? row[columnMap['spouse id']] || '' : '',
          father: columnMap['father id'] !== undefined ? row[columnMap['father id']] || '' : '',
          mother: columnMap['mother id'] !== undefined ? row[columnMap['mother id']] || '' : ''
        };

        // Clean up empty strings
        if (!individual.id.trim()) {
          continue; // Skip rows without ID
        }

        individuals.push(individual);
      }

      if (individuals.length === 0) {
        return chalk.red('No valid individuals found in CSV');
      }

      // Generate family records from relationships
      const families = generateFamilyRecords(individuals);

      // Generate GEDCOM content
      const gedcomLines = [];

      // Header
      gedcomLines.push(...generateGedcomHeader());

      // Individuals
      for (const individual of individuals) {
        gedcomLines.push(...generateGedcomIndividual(individual));
      }

      // Families
      for (const family of families) {
        gedcomLines.push(...generateGedcomFamily(family));
      }

      // Trailer
      gedcomLines.push('0 TRLR');

      // Write to file
      const gedcomContent = gedcomLines.join('\n') + '\n';
      writeFileSync(outputFile, gedcomContent, 'utf-8');

      return chalk.green(`✓ Converted CSV to GEDCOM successfully!\n`) +
             chalk.gray(`  Individuals: ${individuals.length}\n`) +
             chalk.gray(`  Families: ${families.length}\n`) +
             chalk.gray(`  Output: ${outputFile}`);

    } catch (error) {
      return chalk.red(`Conversion failed: ${error.message}`);
    }
  }
}
