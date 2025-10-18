#!/usr/bin/env node

/**
 * Main CLI entry point for AWS Testing Framework
 */

import { configureCLI } from './configure';
import { doctorCLI } from './doctor';
import { initCLI } from './init';
import { StepDiscoveryCommand } from './steps-discovery';

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

  if (
    (args.includes('--version') || args.includes('-v')) &&
    args.length === 1
  ) {
    return { version: true };
  }

  const command = args[0];
  const commandArgs = args.slice(1);

  return {
    command,
    args: commandArgs,
    help: commandArgs.includes('--help') || commandArgs.includes('-h'),
    version: commandArgs.includes('--version') || commandArgs.includes('-v'),
  };
}

function showMainHelp(): void {
  console.log(`
AWS Testing Framework CLI

Usage: aws-testing-framework <command> [options]

Commands:
  init                    Initialize a new AWS testing project
  configure              Configure framework settings
  doctor                 Check environment and diagnose issues
  steps                  Discover available Gherkin step definitions
  generate-feature       Generate feature file with example steps
  
Global Options:
  -h, --help             Show help for command
  -v, --version          Show version information

Examples:
  # Initialize new project
  aws-testing-framework init --template basic

  # Configure framework
  aws-testing-framework configure --interactive

  # Discover available steps
  aws-testing-framework steps

Get help for specific commands:
  aws-testing-framework init --help
  aws-testing-framework configure --help
  aws-testing-framework steps --help
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

      case 'doctor':
        process.argv = ['node', 'doctor', ...(options.args || [])];
        await doctorCLI();
        break;

      case 'steps': {
        const discovery = new StepDiscoveryCommand();

        // Parse steps command arguments
        const stepsArgs = options.args || [];
        const searchIndex = stepsArgs.indexOf('--search');
        const serviceIndex = stepsArgs.indexOf('--service');
        const detailIndex = stepsArgs.indexOf('--detail');
        const exportIndex = stepsArgs.indexOf('--export');

        if (searchIndex !== -1 && stepsArgs[searchIndex + 1]) {
          await discovery.searchSteps(stepsArgs[searchIndex + 1]);
        } else if (serviceIndex !== -1 && stepsArgs[serviceIndex + 1]) {
          await discovery.filterByService(stepsArgs[serviceIndex + 1]);
        } else if (detailIndex !== -1 && stepsArgs[detailIndex + 1]) {
          await discovery.getStepDetail(stepsArgs[detailIndex + 1]);
        } else if (exportIndex !== -1 && stepsArgs[exportIndex + 1]) {
          await discovery.exportSteps(stepsArgs[exportIndex + 1]);
        } else {
          await discovery.execute();
        }
        break;
      }

      case 'help':
      case undefined:
        if (options.help || !options.command) {
          showMainHelp();
        }
        break;

      default:
        if (options.command) {
          console.log(
            '\nRun "aws-testing-framework --help" for available commands.'
          );
        } else {
          showMainHelp();
        }
        process.exit(1);
    }
  } catch (_error) {
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as cliMain };
