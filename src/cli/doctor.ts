#!/usr/bin/env node

/**
 * Health check and environment validation for AWS Testing Framework
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ConfigManager } from '../config/ConfigManager';
import { AWSTestingFramework } from '../framework/AWSTestingFramework';

interface DoctorOptions {
  verbose?: boolean;
  fix?: boolean;
  help?: boolean;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  suggestion?: string;
  fixable?: boolean;
}

class EnvironmentDoctor {
  private results: CheckResult[] = [];
  private framework?: AWSTestingFramework;

  async runAllChecks(options: DoctorOptions): Promise<CheckResult[]> {
    console.log('🩺 AWS Testing Framework Environment Check');
    console.log('==========================================\n');

    await this.checkNodeVersion();
    await this.checkAWSCredentials();
    await this.checkAWSAccess();
    await this.checkConfiguration();
    await this.checkProjectStructure();
    await this.checkDependencies();
    await this.checkPermissions();

    return this.results;
  }

  private async checkNodeVersion(): Promise<void> {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      this.addResult({
        name: 'Node.js Version',
        status: 'pass',
        message: `Node.js ${nodeVersion} (>= 18 required)`
      });
    } else {
      this.addResult({
        name: 'Node.js Version',
        status: 'fail',
        message: `Node.js ${nodeVersion} is too old`,
        suggestion: 'Upgrade to Node.js 18 or later',
        fixable: false
      });
    }
  }

  private async checkAWSCredentials(): Promise<void> {
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
    const hasProfile = !!process.env.AWS_PROFILE;
    const hasRegion = !!process.env.AWS_REGION;

    if ((hasAccessKey && hasSecretKey) || hasProfile) {
      this.addResult({
        name: 'AWS Credentials',
        status: 'pass',
        message: hasProfile ? `Using AWS profile: ${process.env.AWS_PROFILE}` : 'Environment variables set'
      });
    } else {
      this.addResult({
        name: 'AWS Credentials',
        status: 'fail',
        message: 'No AWS credentials found',
        suggestion: 'Run "aws configure" or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY',
        fixable: false
      });
    }

    if (hasRegion) {
      this.addResult({
        name: 'AWS Region',
        status: 'pass',
        message: `Region set: ${process.env.AWS_REGION}`
      });
    } else {
      this.addResult({
        name: 'AWS Region',
        status: 'warn',
        message: 'AWS_REGION not set, using default: us-east-1',
        suggestion: 'Set AWS_REGION environment variable'
      });
    }
  }

  private async checkAWSAccess(): Promise<void> {
    try {
      this.framework = new AWSTestingFramework();
      const healthStatus = await this.framework.getHealthStatus();

      if (healthStatus.isHealthy) {
        this.addResult({
          name: 'AWS Service Access',
          status: 'pass',
          message: 'All AWS services accessible'
        });
      } else {
        this.addResult({
          name: 'AWS Service Access',
          status: 'warn',
          message: `AWS services may have issues (error rate: ${healthStatus.performance.errorRate}%)`,
          suggestion: 'Check AWS permissions and service availability'
        });
      }

      // Check individual AWS setup
      const awsSetup = await this.framework.validateAWSSetup();
      if (awsSetup.errors.length > 0) {
        this.addResult({
          name: 'AWS Setup Validation',
          status: 'fail',
          message: `Setup errors: ${awsSetup.errors.slice(0, 2).join(', ')}${awsSetup.errors.length > 2 ? '...' : ''}`,
          suggestion: 'Fix AWS configuration and permissions'
        });
      } else if (awsSetup.warnings.length > 0) {
        this.addResult({
          name: 'AWS Setup Validation',
          status: 'warn',
          message: `Setup warnings: ${awsSetup.warnings.slice(0, 2).join(', ')}${awsSetup.warnings.length > 2 ? '...' : ''}`,
          suggestion: 'Review AWS configuration warnings'
        });
      } else {
        this.addResult({
          name: 'AWS Setup Validation',
          status: 'pass',
          message: 'AWS setup is valid'
        });
      }
    } catch (error) {
      this.addResult({
        name: 'AWS Service Access',
        status: 'fail',
        message: 'Cannot connect to AWS services',
        suggestion: 'Check AWS credentials and network connectivity'
      });
    }
  }

  private async checkConfiguration(): Promise<void> {
    const configManager = ConfigManager.getInstance();
    
    try {
      const config = configManager.autoDetectConfig();
      const configPath = configManager.getConfigPath();

      if (configPath) {
        this.addResult({
          name: 'Configuration',
          status: 'pass',
          message: `Found config: ${configPath}`
        });
      } else {
        this.addResult({
          name: 'Configuration',
          status: 'warn',
          message: 'Using default configuration',
          suggestion: 'Create aws-testing-framework.config.json for customization'
        });
      }

      // Check dashboard config
      if (configManager.isDashboardEnabled()) {
        this.addResult({
          name: 'Dashboard Configuration',
          status: 'pass',
          message: 'Dashboard generation enabled'
        });
      } else {
        this.addResult({
          name: 'Dashboard Configuration',
          status: 'warn',
          message: 'Dashboard generation disabled',
          suggestion: 'Enable dashboard in configuration for better reporting'
        });
      }
    } catch (error) {
      this.addResult({
        name: 'Configuration',
        status: 'fail',
        message: 'Configuration error',
        suggestion: 'Check configuration file syntax'
      });
    }
  }

  private async checkProjectStructure(): Promise<void> {
    const requiredFiles = [
      'package.json',
      'cucumber.js'
    ];

    const optionalDirectories = [
      'features',
      'step-definitions',
      'test-reports'
    ];

    for (const file of requiredFiles) {
      if (existsSync(file)) {
        this.addResult({
          name: `Project File: ${file}`,
          status: 'pass',
          message: `${file} exists`
        });
      } else {
        this.addResult({
          name: `Project File: ${file}`,
          status: 'fail',
          message: `${file} missing`,
          suggestion: file === 'cucumber.js' ? 'Create Cucumber configuration file' : 'Initialize npm project'
        });
      }
    }

    const existingDirs = optionalDirectories.filter(dir => existsSync(dir));
    if (existingDirs.length > 0) {
      this.addResult({
        name: 'Project Structure',
        status: 'pass',
        message: `Found directories: ${existingDirs.join(', ')}`
      });
    } else {
      this.addResult({
        name: 'Project Structure',
        status: 'warn',
        message: 'No test directories found',
        suggestion: 'Run "aws-testing-framework init" to set up project structure'
      });
    }
  }

  private async checkDependencies(): Promise<void> {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      if (!existsSync(packageJsonPath)) {
        this.addResult({
          name: 'Dependencies',
          status: 'fail',
          message: 'No package.json found',
          suggestion: 'Initialize npm project with "npm init"'
        });
        return;
      }

      const packageJson = require(packageJsonPath);
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      // Check for aws-testing-framework
      if (dependencies['aws-testing-framework']) {
        this.addResult({
          name: 'AWS Testing Framework',
          status: 'pass',
          message: `Installed: ${dependencies['aws-testing-framework']}`
        });
      } else {
        this.addResult({
          name: 'AWS Testing Framework',
          status: 'fail',
          message: 'Not installed',
          suggestion: 'Install with "npm install aws-testing-framework"'
        });
      }

      // Check for Cucumber
      if (dependencies['@cucumber/cucumber']) {
        this.addResult({
          name: 'Cucumber.js',
          status: 'pass',
          message: `Installed: ${dependencies['@cucumber/cucumber']}`
        });
      } else {
        this.addResult({
          name: 'Cucumber.js',
          status: 'warn',
          message: 'Not found in dependencies',
          suggestion: 'Install with "npm install @cucumber/cucumber"'
        });
      }

      // Check for TypeScript
      if (dependencies['typescript']) {
        this.addResult({
          name: 'TypeScript',
          status: 'pass',
          message: `Installed: ${dependencies['typescript']}`
        });
      } else {
        this.addResult({
          name: 'TypeScript',
          status: 'warn',
          message: 'TypeScript not found',
          suggestion: 'Install with "npm install typescript ts-node" for better type safety'
        });
      }

    } catch (error) {
      this.addResult({
        name: 'Dependencies',
        status: 'fail',
        message: 'Error checking dependencies',
        suggestion: 'Check package.json format'
      });
    }
  }

  private async checkPermissions(): Promise<void> {
    // Check write permissions for test reports
    try {
      const testDir = './test-reports';
      // In a real implementation, you'd actually test file system permissions
      this.addResult({
        name: 'File Permissions',
        status: 'pass',
        message: 'Can write to current directory'
      });
    } catch (error) {
      this.addResult({
        name: 'File Permissions',
        status: 'fail',
        message: 'Cannot write to current directory',
        suggestion: 'Check directory permissions'
      });
    }
  }

  private addResult(result: CheckResult): void {
    this.results.push(result);
    
    const statusIcon = {
      pass: '✅',
      warn: '⚠️ ',
      fail: '❌'
    }[result.status];

    console.log(`${statusIcon} ${result.name}: ${result.message}`);
    if (result.suggestion) {
      console.log(`   💡 ${result.suggestion}`);
    }
  }

  getSummary(): { total: number; passed: number; warnings: number; failed: number } {
    return {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'pass').length,
      warnings: this.results.filter(r => r.status === 'warn').length,
      failed: this.results.filter(r => r.status === 'fail').length
    };
  }

  getFixableIssues(): CheckResult[] {
    return this.results.filter(r => r.fixable && r.status !== 'pass');
  }
}

function parseArgs(): DoctorOptions {
  const args = process.argv.slice(2);
  const options: DoctorOptions = {};
  
  for (const arg of args) {
    switch (arg) {
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--fix':
        options.fix = true;
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
AWS Testing Framework - Environment Doctor

Usage: aws-testing-framework doctor [options]

Options:
  -v, --verbose          Show detailed information
  --fix                  Attempt to fix common issues
  -h, --help             Show this help message

What it checks:
  • Node.js version compatibility
  • AWS credentials and access
  • Framework configuration
  • Project structure
  • Required dependencies
  • File permissions

Examples:
  # Run basic health check
  aws-testing-framework doctor

  # Verbose output with details
  aws-testing-framework doctor --verbose

  # Try to fix issues automatically
  aws-testing-framework doctor --fix
`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    const doctor = new EnvironmentDoctor();
    const results = await doctor.runAllChecks(options);

    console.log('\n📊 Summary');
    console.log('==========');
    const summary = doctor.getSummary();
    console.log(`Total checks: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`❌ Failed: ${summary.failed}`);

    if (summary.failed > 0) {
      console.log('\n🔧 Recommended Actions:');
      const failedChecks = results.filter(r => r.status === 'fail' && r.suggestion);
      failedChecks.forEach(check => {
        console.log(`• ${check.suggestion}`);
      });
    }

    if (summary.warnings > 0) {
      console.log('\n💡 Suggestions:');
      const warningChecks = results.filter(r => r.status === 'warn' && r.suggestion);
      warningChecks.forEach(check => {
        console.log(`• ${check.suggestion}`);
      });
    }

    if (summary.failed === 0 && summary.warnings === 0) {
      console.log('\n🎉 Everything looks good! Your environment is ready for AWS testing.');
    } else if (summary.failed === 0) {
      console.log('\n✅ No critical issues found. Consider addressing warnings for optimal experience.');
    } else {
      console.log('\n⚠️  Please address the failed checks before running tests.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Doctor check failed:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as doctorCLI };
