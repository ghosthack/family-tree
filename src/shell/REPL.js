import * as readline from 'readline';
import chalk from 'chalk';

/**
 * REPL (Read-Eval-Print Loop) for interactive shell
 */
export class REPL {
  constructor(commands, navigator) {
    this.commands = commands;
    this.navigator = navigator;
    this.history = [];
    this.historyIndex = -1;
    this.rl = null;
  }

  /**
   * Start the REPL
   */
  start() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
      historySize: 100
    });

    // Handle line input
    this.rl.on('line', (line) => {
      this.handleLine(line);
    });

    // Handle Ctrl+C
    this.rl.on('SIGINT', () => {
      console.log(chalk.yellow('\nUse "exit" or Ctrl+D to quit'));
      this.rl.prompt();
    });

    // Handle Ctrl+D (EOF)
    this.rl.on('close', () => {
      console.log(chalk.cyan('\nGoodbye!'));
      process.exit(0);
    });

    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Show welcome message
    this.showWelcome();

    // Start prompt
    this.rl.prompt();
  }

  /**
   * Setup keyboard shortcuts
   * Note: readline already handles:
   * - Up/Down arrows for history
   * - Ctrl+C for SIGINT
   * - Ctrl+D for close
   * - Left/Right arrows for cursor movement
   * - Backspace/Delete for editing
   */
  setupKeyboardShortcuts() {
    // Readline provides all necessary keyboard shortcuts
    // No need to set raw mode as it can cause terminal issues
  }

  /**
   * Handle a line of input
   */
  handleLine(line) {
    const trimmed = line.trim();

    if (trimmed) {
      // Add to history
      this.history.push(trimmed);
      this.historyIndex = this.history.length;

      // Execute command
      const output = this.commands.execute(trimmed);

      if (output) {
        console.log(output);
      }
    }

    // Update prompt and show it
    this.rl.setPrompt(this.getPrompt());
    this.rl.prompt();
  }

  /**
   * Get current prompt string
   */
  getPrompt() {
    const promptText = this.navigator.getPrompt();
    return chalk.bold.green(promptText) + chalk.white('> ');
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    const lines = [];

    lines.push('');
    lines.push(chalk.bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
    lines.push(chalk.bold.cyan('║') + '                                                           ' + chalk.bold.cyan('║'));
    lines.push(
      chalk.bold.cyan('║') +
        '                  ' +
        chalk.bold.white('GEDCOM Shell Navigator') +
        '                   ' +
        chalk.bold.cyan('║')
    );
    lines.push(chalk.bold.cyan('║') + '                                                           ' + chalk.bold.cyan('║'));
    lines.push(
      chalk.bold.cyan('║') + '           ' + chalk.gray('Navigate your family tree like a pro') + '            ' + chalk.bold.cyan('║')
    );
    lines.push(chalk.bold.cyan('║') + '                                                           ' + chalk.bold.cyan('║'));
    lines.push(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝'));
    lines.push('');
    lines.push(chalk.yellow('Type "help" for available commands'));
    lines.push(chalk.yellow('Type "ls" to list all individuals'));
    lines.push(chalk.yellow('Type "stats" to see tree statistics'));
    lines.push('');

    console.log(lines.join('\n'));
  }

  /**
   * Stop the REPL
   */
  stop() {
    if (this.rl) {
      this.rl.close();
    }
  }
}
