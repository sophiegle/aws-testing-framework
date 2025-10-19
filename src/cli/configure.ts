#!/usr/bin/env node

/**
 * Interactive configuration wizard for AWS Testing Framework
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import inquirer from 'inquirer';
import {
  type AWSTestingFrameworkConfig,
  ConfigManager,
} from '../config/ConfigManager';

interface ConfigWizardOptions {
  interactive?: boolean;
  output?: string;
  overwrite?: boolean;
  help?: boolean;
}

class ConfigurationWizard {
  private config: AWSTestingFrameworkConfig = {};

  async runWizard(): Promise<AWSTestingFrameworkConfig> {
    console.log('🔧 AWS Testing Framework Configuration Wizard');
    console.log('================================================\n');

    await this.configureTesting();
    await this.configureAWS();
    await this.configureCI();

    return this.config;
  }

  private async configureTesting(): Promise<void> {
    console.log('🧪 Testing Configuration');
    console.log('------------------------\n');

    const testingAnswers = await inquirer.prompt([
      {
        type: 'number',
        name: 'defaultTimeout',
        message: 'Default timeout for AWS operations (milliseconds):',
        default: 30000,
        validate: (input) => input > 0 || 'Please enter a positive number',
      },
      {
        type: 'number',
        name: 'retryAttempts',
        message: 'Number of retry attempts for failed operations:',
        default: 3,
        validate: (input) => input >= 0 || 'Please enter a non-negative number',
      },
      {
        type: 'number',
        name: 'retryDelay',
        message: 'Delay between retries (milliseconds):',
        default: 1000,
        validate: (input) => input >= 0 || 'Please enter a non-negative number',
      },
      {
        type: 'confirm',
        name: 'verbose',
        message: 'Enable verbose logging?',
        default: false,
      },
    ]);

    this.config.testing = testingAnswers;
    console.log();
  }

  private async configureAWS(): Promise<void> {
    console.log('☁️  AWS Configuration');
    console.log('--------------------\n');

    const detectedRegion = process.env.AWS_REGION || 'eu-west-2';

    const awsAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'region',
        message: 'AWS Region:',
        choices: [
          'eu-west-2',
          'us-east-2',
          'us-west-1',
          'us-west-2',
          'eu-west-1',
          'eu-west-2',
          'eu-central-1',
          'ap-southeast-1',
          'ap-southeast-2',
          'ap-northeast-1',
          new inquirer.Separator(),
          { name: 'Other (enter manually)', value: 'custom' },
        ],
        default: detectedRegion,
      },
      {
        type: 'input',
        name: 'customRegion',
        message: 'Enter AWS region:',
        when: (answers) => answers.region === 'custom',
        validate: (input) => input.length > 0 || 'Please enter a region',
      },
      {
        type: 'number',
        name: 'maxRetries',
        message: 'Maximum retry attempts for AWS SDK:',
        default: 3,
        validate: (input) => input >= 0 || 'Please enter a non-negative number',
      },
      {
        type: 'number',
        name: 'timeout',
        message: 'AWS request timeout (milliseconds):',
        default: 10000,
        validate: (input) => input > 0 || 'Please enter a positive number',
      },
    ]);

    this.config.aws = {
      region: awsAnswers.customRegion || awsAnswers.region,
      maxRetries: awsAnswers.maxRetries,
      timeout: awsAnswers.timeout,
    };

    console.log();
  }

  private async configureCI(): Promise<void> {
    console.log('🔄 CI/CD Configuration');
    console.log('----------------------\n');

    const isCI = process.env.CI === 'true';
    const detectedEnv = process.env.NODE_ENV || (isCI ? 'ci' : 'development');

    const ciAnswers = await inquirer.prompt([
      {
        type: 'list',
        name: 'environment',
        message: 'Environment type:',
        choices: ['development', 'staging', 'production', 'ci'],
        default: detectedEnv,
      },
      {
        type: 'confirm',
        name: 'configureS3Upload',
        message: 'Configure S3 upload for test reports?',
        default: false,
        when: (answers) => answers.environment !== 'development',
      },
      {
        type: 'input',
        name: 's3Bucket',
        message: 'S3 bucket for reports:',
        when: (answers) => answers.configureS3Upload,
        validate: (input) => input.length > 0 || 'Please enter a bucket name',
      },
      {
        type: 'input',
        name: 's3Prefix',
        message: 'S3 prefix for reports (optional):',
        default: 'test-reports',
        when: (answers) => answers.configureS3Upload,
      },
      {
        type: 'confirm',
        name: 'configureSlack',
        message: 'Configure Slack notifications?',
        default: false,
        when: (answers) => answers.environment !== 'development',
      },
      {
        type: 'input',
        name: 'slackChannel',
        message: 'Slack channel for notifications:',
        default: '#test-results',
        when: (answers) => answers.configureSlack,
        validate: (input) =>
          input.startsWith('#') || 'Channel name should start with #',
      },
      {
        type: 'confirm',
        name: 'slackOnFailure',
        message: 'Send Slack notifications on test failures?',
        default: true,
        when: (answers) => answers.configureSlack,
      },
      {
        type: 'confirm',
        name: 'slackOnSuccess',
        message: 'Send Slack notifications on test success?',
        default: false,
        when: (answers) => answers.configureSlack,
      },
    ]);

    this.config.ci = {
      environment: ciAnswers.environment,
      buildId: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
      branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME,
      commitHash: process.env.COMMIT_SHA || process.env.GITHUB_SHA,
    };

    if (ciAnswers.configureS3Upload) {
      this.config.ci.uploadToS3 = {
        bucket: ciAnswers.s3Bucket,
        prefix: ciAnswers.s3Prefix,
        region: this.config.aws?.region || 'eu-west-2',
      };
    }

    if (ciAnswers.configureSlack) {
      this.config.ci.notifications = {
        slack: {
          webhookUrl: 'SLACK_WEBHOOK_URL_PLACEHOLDER', // Will be replaced from env
          channel: ciAnswers.slackChannel,
          onFailure: ciAnswers.slackOnFailure,
          onSuccess: ciAnswers.slackOnSuccess,
        },
      };
    }

    console.log();
  }

  generateConfigFiles(): Record<string, string> {
    const files: Record<string, string> = {};

    // Main config file
    files['aws-testing-framework.config.json'] = JSON.stringify(
      this.config,
      null,
      2
    );

    // Development-specific config
    const devConfig = {
      ...this.config,
      testing: {
        ...this.config.testing,
        verbose: true,
        defaultTimeout: 60000,
      },
    };
    files['development.config.json'] = JSON.stringify(devConfig, null, 2);

    // CI-specific config
    const ciConfig = {
      ...this.config,
      testing: {
        ...this.config.testing,
        verbose: false,
      },
    };
    files['ci.config.json'] = JSON.stringify(ciConfig, null, 2);

    return files;
  }
}

function parseArgs(): ConfigWizardOptions {
  const args = process.argv.slice(2);
  const options: ConfigWizardOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--overwrite':
        options.overwrite = true;
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
AWS Testing Framework - Configuration Wizard

Usage: aws-testing-framework configure [options]

Options:
  -i, --interactive       Run interactive configuration wizard
  -o, --output <dir>      Output directory for config files
  --overwrite             Overwrite existing configuration files
  -h, --help              Show this help message

Examples:
  # Run interactive wizard
  aws-testing-framework configure --interactive

  # Generate configs in specific directory
  aws-testing-framework configure --output ./config

  # Overwrite existing configs
  aws-testing-framework configure --overwrite

Features:
  • Interactive prompts for all configuration options
  • Environment detection (development/CI)
  • Multiple config file generation (main, dev, ci)
  • Validation and best practice recommendations
  • AWS service detection and setup guidance
`);
}

async function detectCurrentSetup(): Promise<void> {
  console.log('🔍 Detecting Current Setup');
  console.log('==========================\n');

  // Check for existing configs
  const configManager = ConfigManager.getInstance();
  const existingConfigPath = configManager.getConfigPath();

  if (existingConfigPath) {
    console.log(`✅ Found existing config: ${existingConfigPath}`);
  } else {
    console.log('ℹ️  No existing configuration found');
  }

  // Check AWS credentials
  if (process.env.AWS_REGION) {
    console.log(`✅ AWS Region detected: ${process.env.AWS_REGION}`);
  } else {
    console.log('⚠️  AWS_REGION not set - using default: eu-west-2');
  }

  if (process.env.AWS_PROFILE) {
    console.log(`✅ AWS Profile detected: ${process.env.AWS_PROFILE}`);
  }

  // Check CI environment
  if (process.env.CI) {
    console.log(`✅ CI environment detected: ${process.env.CI}`);
  }

  console.log();
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await detectCurrentSetup();

    const wizard = new ConfigurationWizard();
    const _config = await wizard.runWizard();

    console.log('💾 Generating Configuration Files');
    console.log('=================================');

    const files = wizard.generateConfigFiles();
    const outputDir = options.output || process.cwd();

    for (const [fileName, content] of Object.entries(files)) {
      const filePath = join(outputDir, fileName);

      if (existsSync(filePath) && !options.overwrite) {
        console.log(
          `⚠️  Skipping ${fileName} (already exists, use --overwrite to replace)`
        );
        continue;
      }

      writeFileSync(filePath, content);
      console.log(`✅ Created: ${fileName}`);
    }

    console.log('\n🎉 Configuration Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Review the generated configuration files');
    console.log('2. Customize settings for your specific needs');
    console.log('\n💡 Tips:');
    console.log('• Use development.config.json for local development');
    console.log('• Use ci.config.json for CI/CD pipelines');
    console.log('• Check examples/config/ for more advanced configurations');
  } catch (error) {
    // biome-ignore lint/suspicious/noConsole: CLI script requires console output
    console.error(
      '❌ Configuration failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as configureCLI };
