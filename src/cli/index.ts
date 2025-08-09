#!/usr/bin/env node

/**
 * Main CLI entry point for AWS Testing Framework
 */

import { generateDashboardCLI } from './generate-dashboard';
import { initCLI } from './init';
import { configureCLI } from './configure';
import { doctorCLI } from './doctor';

interface CLIOptions {
  command?: string;
  args?: string[];
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { help: true };
  }

  // Check for global help/version flags (only if no command is present)
  if ((args.includes('--help') || args.includes('-h')) && args.length === 1) {
    return { help: true };
  }
  
  if ((args.includes('--version') || args.includes('-v')) && args.length === 1) {
    return { version: true };
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  return {
    command,
    args: commandArgs,
    help: commandArgs.includes('--help') || commandArgs.includes('-h'),
    version: commandArgs.includes('--version') || commandArgs.includes('-v')
  };
}

function showMainHelp(): void {
  console.log(`
AWS Testing Framework CLI

Usage: aws-testing-framework <command> [options]

Commands:
  init                    Initialize a new AWS testing project
  configure              Configure framework settings
  generate-dashboard     Generate test dashboard from results
  doctor                 Check environment and diagnose issues
  
Global Options:
  -h, --help             Show help for command
  -v, --version          Show version information

Examples:
  # Initialize new project
  aws-testing-framework init --template basic

  # Configure framework
  aws-testing-framework configure --interactive

  # Generate dashboard
  aws-testing-framework generate-dashboard

Get help for specific commands:
  aws-testing-framework init --help
  aws-testing-framework configure --help
  aws-testing-framework generate-dashboard --help
  aws-testing-framework doctor --help

Documentation:
  GitHub: https://github.com/sophiegle/aws-testing-framework
  Examples: https://github.com/sophiegle/aws-testing-framework/tree/main/examples
`);
}

function showVersion(): void {
  // In a real implementation, this would read from package.json
  console.log('AWS Testing Framework v0.3.0');
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.version) {
    showVersion();
    process.exit(0);
  }

  try {
    switch (options.command) {
      case 'init':
        // Restore original args for subcommand
        process.argv = ['node', 'init', ...(options.args || [])];
        await initCLI();
        break;

      case 'configure':
        process.argv = ['node', 'configure', ...(options.args || [])];
        await configureCLI();
        break;

      case 'generate-dashboard':
      case 'dashboard':
        process.argv = ['node', 'generate-dashboard', ...(options.args || [])];
        await generateDashboardCLI();
        break;

      case 'doctor':
        process.argv = ['node', 'doctor', ...(options.args || [])];
        await doctorCLI();
        break;

      case 'help':
      case undefined:
        if (options.help || !options.command) {
          showMainHelp();
        }
        break;

      default:
        if (options.command) {
          console.error(`❌ Unknown command: ${options.command}`);
          console.log('\nRun "aws-testing-framework --help" for available commands.');
        } else {
          showMainHelp();
        }
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as cliMain };
