#!/usr/bin/env node

import { GedcomParser } from './parser/gedcomParser.js';
import { Tree } from './models/Tree.js';
import { Navigator } from './navigation/Navigator.js';
import { Formatter } from './display/Formatter.js';
import { Commands } from './shell/Commands.js';
import { REPL } from './shell/REPL.js';
import chalk from 'chalk';
import readline from 'readline';

/**
 * Main application entry point
 */
class GedcomShellNavigator {
  constructor() {
    this.filepath = null;
    this.tree = null;
    this.navigator = null;
    this.formatter = null;
    this.commands = null;
    this.repl = null;
  }

  /**
   * Load GEDCOM file
   */
  loadFile(filepath) {
    try {
      console.log(chalk.cyan(`Loading GEDCOM file: ${filepath}...`));

      const parser = new GedcomParser();
      const parsedData = parser.parse(filepath);

      this.tree = new Tree(parsedData);
      this.filepath = filepath;
      console.log(chalk.green(`✓ Loaded ${this.tree.individuals.size} individuals and ${this.tree.families.size} families`));

      return true;
    } catch (error) {
      console.error(chalk.red(`Error loading file: ${error.message}`));
      return false;
    }
  }

  /**
   * Reload the current GEDCOM file
   */
  reload() {
    if (!this.filepath) {
      throw new Error('No file loaded');
    }

    try {
      console.log(chalk.cyan(`Reloading GEDCOM file: ${this.filepath}...`));

      const parser = new GedcomParser();
      const parsedData = parser.parse(this.filepath);
      const newTree = new Tree(parsedData);

      // Update tree references in all components
      this.tree = newTree;
      this.navigator.tree = newTree;
      this.formatter.tree = newTree;

      // Reset navigation state to root
      this.navigator.navigateToRoot();
      this.navigator.clearHistory();

      console.log(chalk.green(`✓ Reloaded ${this.tree.individuals.size} individuals and ${this.tree.families.size} families`));

      return true;
    } catch (error) {
      console.error(chalk.red(`Error reloading file: ${error.message}`));
      return false;
    }
  }

  /**
   * Initialize the application
   */
  initialize() {
    this.navigator = new Navigator(this.tree);
    this.formatter = new Formatter(this.tree);
    this.commands = new Commands(this.navigator, this.formatter, this);
    this.repl = new REPL(this.commands, this.navigator);
  }

  /**
   * Start the interactive shell
   */
  start() {
    if (!this.tree) {
      console.error(chalk.red('No GEDCOM file loaded. Please load a file first.'));
      process.exit(1);
    }

    this.initialize();
    this.repl.start();
  }
}

/**
 * Prompt user for filename interactively
 */
function promptForFilename() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(chalk.cyan('Enter GEDCOM file path (default: genealogy.ged): '), (answer) => {
      rl.close();
      const filepath = answer.trim() || 'genealogy.ged';
      resolve(filepath);
    });
  });
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  let filepath;

  if (args.length === 0) {
    console.log(chalk.yellow('No file specified.'));
    filepath = await promptForFilename();

    if (!filepath) {
      console.log(chalk.red('No filename provided. Exiting.'));
      process.exit(1);
    }
  } else {
    filepath = args[0];
  }

  const app = new GedcomShellNavigator();

  if (app.loadFile(filepath)) {
    app.start();
  } else {
    process.exit(1);
  }
}

// Run the application
main();
