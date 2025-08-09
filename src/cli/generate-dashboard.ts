#!/usr/bin/env node

/**
 * CLI tool for generating dashboards with auto-detected configuration
 */

import { ConfigManager, generateSmartDashboard } from '../index';

interface CLIOptions {
  config?: string;
  input?: string;
  output?: string;
  theme?: 'light' | 'dark' | 'both';
  verbose?: boolean;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--config':
      case '-c':
        options.config = args[++i];
        break;
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--theme':
      case '-t':
        options.theme = args[++i] as 'light' | 'dark' | 'both';
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
AWS Testing Framework - Dashboard Generator

Usage: aws-testing-framework generate-dashboard [options]

Options:
  -c, --config <path>    Path to configuration file
  -i, --input <path>     Path to Cucumber JSON report
  -o, --output <dir>     Output directory for dashboards
  -t, --theme <theme>    Theme to generate (light|dark|both)
  -v, --verbose          Verbose output
  -h, --help             Show this help message

Examples:
  # Auto-detect configuration and generate dashboard
  aws-testing-framework generate-dashboard
  
  # Use specific configuration file
  aws-testing-framework generate-dashboard --config ./my-config.js
  
  # Generate only light theme
  aws-testing-framework generate-dashboard --theme light
  
  # Use custom input and output paths
  aws-testing-framework generate-dashboard --input ./reports/tests.json --output ./dashboards

Configuration:
  The tool automatically detects configuration files in the following order:
  1. aws-testing-framework.config.js
  2. aws-testing-framework.config.json
  3. awstf.config.js
  4. awstf.config.json
  5. .awstf.json
  6. .aws-testing-framework.json
  7. package.json (awsTestingFramework section)

  For configuration examples, see:
  https://github.com/sophiegle/aws-testing-framework/tree/main/examples/config
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    if (options.verbose) {
      console.log('🚀 AWS Testing Framework Dashboard Generator');
      console.log('==========================================\n');
    }

    // Initialize configuration manager
    const configManager = ConfigManager.getInstance();

    // Load configuration
    if (options.config) {
      if (options.verbose) {
        console.log(`📝 Loading configuration from: ${options.config}`);
      }
      // TODO: Implement custom config loading
    } else {
      if (options.verbose) {
        console.log('🔍 Auto-detecting configuration...');
      }
      configManager.autoDetectConfig();

      const configPath = configManager.getConfigPath();
      if (configPath && options.verbose) {
        console.log(`✅ Found configuration: ${configPath}`);
      } else if (options.verbose) {
        console.log('⚙️  Using default configuration');
      }
    }

    // Check if dashboard generation is enabled
    if (!configManager.isDashboardEnabled()) {
      console.log(
        '💡 Enable it by setting dashboard.enabled = true in your config'
      );
      process.exit(1);
    }

    // Apply CLI overrides
    const configOverrides: Record<string, unknown> = {};
    if (options.theme) {
      if (options.theme !== 'both') {
        configOverrides.theme = options.theme;
      }
    }

    if (options.verbose) {
      console.log('📊 Generating dashboard...');
    }

    // Generate dashboard
    const result = generateSmartDashboard(options.input, configOverrides);

    if (result.success) {
      console.log('✅', result.message);
      if (result.paths && options.verbose) {
        console.log(`📊 Light theme: ${result.paths.lightTheme}`);
        console.log(`🌙 Dark theme: ${result.paths.darkTheme}`);
      }
    } else {
      process.exit(1);
    }
  } catch (error) {
    if (options.verbose && error instanceof Error) {
    }
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as generateDashboardCLI };
