/**
 * Help text and documentation for shell commands
 */

import chalk from 'chalk';

/**
 * Get general help text showing all available commands
 * @returns {string} Formatted help text
 */
export function getGeneralHelp() {
  const lines = [];
  const separator = chalk.cyan('━'.repeat(60));

  lines.push(separator);
  lines.push(chalk.bold.cyan('GEDCOM Shell Navigator - Help'));
  lines.push(separator);
  lines.push('');

  lines.push(chalk.bold.yellow('Navigation Commands:'));
  lines.push(`  ${chalk.green('ls')}              List individuals/family members at current location`);
  lines.push(`  ${chalk.green('ls -b|--birthday')} List living individuals sorted by birthday (month/day)`);
  lines.push(`  ${chalk.green('ls -b -a')}        List all individuals (including deceased) by birthday`);
  lines.push(`  ${chalk.green('cd <id|name>')}   Navigate to individual or family`);
  lines.push(`  ${chalk.green('cd ..')}          Navigate back`);
  lines.push(`  ${chalk.green('cd ~')} or ${chalk.green('cd /')}    Navigate to root`);
  lines.push(`  ${chalk.green('pwd')}             Print current location`);
  lines.push('');

  lines.push(chalk.bold.yellow('Information Commands:'));
  lines.push(`  ${chalk.green('show [id|name]')} Display detailed information`);
  lines.push(`  ${chalk.green('tree [depth]')}   Display descendant tree (default depth: 3)`);
  lines.push(`  ${chalk.green('ancestors [depth]')} Display ancestor tree with generational labels`);
  lines.push(`  ${chalk.green('find <name>')}    Search for individuals by name`);
  lines.push(`  ${chalk.green('stats')}           Show statistics about the tree`);
  lines.push('');

  lines.push(chalk.bold.yellow('Relationship Commands:'));
  lines.push(`  ${chalk.green('parents')}         Show parents of current individual`);
  lines.push(`  ${chalk.green('children')}        Show children of current individual`);
  lines.push(`  ${chalk.green('siblings')}        Show siblings of current individual`);
  lines.push(`  ${chalk.green('spouses')}         Show spouses of current individual`);
  lines.push('');

  lines.push(chalk.bold.yellow('Utility Commands:'));
  lines.push(`  ${chalk.green('help [command]')} Show this help or help for specific command`);
  lines.push(`  ${chalk.green('export [file]')}  Export current list to CSV file`);
  lines.push(`  ${chalk.green('reload')}          Reload the GEDCOM file from disk`);
  lines.push(`  ${chalk.green('clear')}           Clear screen`);
  lines.push(`  ${chalk.green('exit')} or ${chalk.green('quit')}   Exit the application`);
  lines.push('');

  lines.push(chalk.bold.yellow('Keyboard Shortcuts:'));
  lines.push(`  ${chalk.cyan('↑/↓')}             Navigate command history`);
  lines.push(`  ${chalk.cyan('Tab')}             Auto-complete (future feature)`);
  lines.push(`  ${chalk.cyan('Ctrl+C')}          Cancel current input`);
  lines.push(`  ${chalk.cyan('Ctrl+D')}          Exit application`);

  return lines.join('\n');
}

/**
 * Get help text for a specific command
 * @param {string} command - The command name
 * @returns {string} Formatted help text for the command
 */
export function getCommandHelp(command) {
  const helps = {
    ls: `ls [options] - List individuals or family members at current location
  ls              - List with standard columns
  ls -b           - List living people sorted by birthday (month/day)
  ls --birthday   - List living people sorted by birthday (month/day)
  ls -b -a        - List all people (including deceased) sorted by birthday
  ls -b --all     - List all people (including deceased) sorted by birthday`,
    cd: `cd <target> - Navigate to individual or family
  cd @I1@       - Navigate to individual by ID
  cd "John Doe" - Navigate to individual by name
  cd ..         - Navigate back
  cd ~ or cd /  - Navigate to root`,
    pwd: 'pwd - Print current working directory (location path)',
    show: `show [id|name] - Display detailed information
  show          - Show current individual/family
  show @I1@     - Show specific individual
  show "John"   - Show individual by name`,
    tree: `tree [depth] [direction] - Display tree structure
  tree          - Show descendants (depth 3)
  tree 5        - Show descendants (depth 5)
  tree 3 ancestors - Show ancestors (depth 3)`,
    ancestors: `ancestors [depth] - Display ancestor tree with generational labels
  ancestors     - Show ancestors (depth 3)
  ancestors 5   - Show ancestors (depth 5)
  ancestors 10  - Show ancestors (depth 10)

  Labels: father/mother → grandfather/grandmother → great-grandfather
          → 2nd great-grandfather → 3rd great-grandfather, etc.`,
    find: 'find <name> - Search for individuals by name (supports partial matching)',
    stats: 'stats - Show statistics about the genealogy tree',
    export: `export [filename] [options] - Export current list to CSV file
  export                    - Export to gedcom_export.csv with default columns
  export mydata.csv         - Export to specified filename
  export --columns name,birth,death - Export with specific columns
  export --path /path/to/dir - Export to specific directory
  export data.csv --columns id,name,birth,death,father,mother

  Available columns:
    id, name, birth, death, birthplace, deathplace,
    spouse, father, mother, age, sex

  Default columns: id, name, birth, death, spouse, father, mother, birthplace`,
    convert: `convert <input.csv> <output.ged> - Convert CSV export to GEDCOM format
  convert data.csv output.ged     - Convert CSV to GEDCOM
  convert export.csv restored.ged - Restore from CSV export

  Automatically generates:
  - INDI (individual) records from CSV rows
  - FAM (family) records from spouse/parent relationships
  - Minimal GEDCOM header

  CSV must have been exported using the 'export' command`,
    parents: 'parents - Show parents of current individual',
    children: 'children - Show children of current individual',
    siblings: 'siblings - Show siblings of current individual',
    spouses: 'spouses - Show spouses of current individual',
    reload: 'reload - Reload the GEDCOM file from disk (resets navigation to root)',
    help: 'help [command] - Show general help or help for specific command',
    clear: 'clear - Clear the screen',
    exit: 'exit or quit - Exit the application'
  };

  return helps[command.toLowerCase()] || chalk.red(`No help available for: ${command}`);
}

