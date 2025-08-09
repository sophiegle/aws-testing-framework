import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DashboardConfig } from '../reporting/TestDashboard';

export interface AWSTestingFrameworkConfig {
  /** Dashboard generation settings */
  dashboard?: {
    /** Enable automatic dashboard generation */
    enabled?: boolean;
    /** Output directory for dashboards */
    outputDir?: string;
    /** Dashboard themes to generate */
    themes?: Array<'light' | 'dark'>;
    /** Light theme configuration */
    lightTheme?: Partial<DashboardConfig>;
    /** Dark theme configuration */
    darkTheme?: Partial<DashboardConfig>;
    /** Auto-open dashboard in browser (development only) */
    autoOpen?: boolean;
    /** Generate dashboard after each test run */
    autoGenerate?: boolean;
  };
  
  /** Test execution settings */
  testing?: {
    /** Default timeout for AWS operations */
    defaultTimeout?: number;
    /** Retry attempts for failed operations */
    retryAttempts?: number;
    /** Retry delay in milliseconds */
    retryDelay?: number;
    /** Enable verbose logging */
    verbose?: boolean;
  };

  /** AWS configuration overrides */
  aws?: {
    /** Default AWS region */
    region?: string;
    /** Maximum retry attempts for AWS SDK */
    maxRetries?: number;
    /** Request timeout in milliseconds */
    timeout?: number;
  };

  /** Reporting configuration */
  reporting?: {
    /** Base directory for all reports */
    baseDir?: string;
    /** Cucumber JSON report path */
    cucumberJsonPath?: string;
    /** Include performance metrics */
    includePerformanceMetrics?: boolean;
    /** Include step details */
    includeStepDetails?: boolean;
    /** Maximum features to show in reports */
    maxFeaturesToShow?: number;
  };

  /** CI/CD integration settings */
  ci?: {
    /** Environment name (dev, staging, prod) */
    environment?: string;
    /** Build/pipeline identifier */
    buildId?: string;
    /** Git branch name */
    branch?: string;
    /** Git commit hash */
    commitHash?: string;
    /** Pull request number */
    pullRequestNumber?: number;
    /** Upload results to S3 */
    uploadToS3?: {
      bucket: string;
      prefix?: string;
      region?: string;
    };
    /** Send notifications */
    notifications?: {
      slack?: {
        webhookUrl: string;
        channel: string;
        onFailure?: boolean;
        onSuccess?: boolean;
      };
      email?: {
        recipients: string[];
        onFailure?: boolean;
        onSuccess?: boolean;
      };
    };
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AWSTestingFrameworkConfig | null = null;
  private configPath: string | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Auto-detect and load configuration from user's project
   */
  public autoDetectConfig(startDir?: string): AWSTestingFrameworkConfig {
    if (this.config) {
      return this.config;
    }

    const searchDir = startDir || process.cwd();
    const configPath = this.findConfigFile(searchDir);
    
    if (configPath) {
      this.config = this.loadConfigFile(configPath);
      this.configPath = configPath;
    } else {
      // Use default configuration
      this.config = this.getDefaultConfig();
    }

    return this.config;
  }

  /**
   * Find configuration file in project hierarchy
   */
  private findConfigFile(startDir: string): string | null {
    const configFileNames = [
      'aws-testing-framework.config.js',
      'aws-testing-framework.config.json',
      'awstf.config.js',
      'awstf.config.json',
      '.awstf.json',
      '.aws-testing-framework.json'
    ];

    let currentDir = resolve(startDir);
    const rootDir = resolve('/');

    while (currentDir !== rootDir) {
      for (const configFileName of configFileNames) {
        const configPath = join(currentDir, configFileName);
        if (existsSync(configPath)) {
          return configPath;
        }
      }
      
      // Check in package.json
      const packageJsonPath = join(currentDir, 'package.json');
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
          if (packageJson.awsTestingFramework) {
            return packageJsonPath;
          }
        } catch {
          // Ignore invalid package.json
        }
      }

      currentDir = resolve(currentDir, '..');
    }

    return null;
  }

  /**
   * Load configuration from file
   */
  private loadConfigFile(configPath: string): AWSTestingFrameworkConfig {
    try {
      if (configPath.endsWith('package.json')) {
        const packageJson = JSON.parse(readFileSync(configPath, 'utf-8'));
        return packageJson.awsTestingFramework || this.getDefaultConfig();
      }

      if (configPath.endsWith('.js')) {
        // Dynamic import for ES modules/CommonJS
        delete require.cache[require.resolve(configPath)];
        const configModule = require(configPath);
        return configModule.default || configModule;
      }

      if (configPath.endsWith('.json')) {
        return JSON.parse(readFileSync(configPath, 'utf-8'));
      }

      throw new Error(`Unsupported config file format: ${configPath}`);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}:`, error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AWSTestingFrameworkConfig {
    return {
      dashboard: {
        enabled: true,
        outputDir: './test-reports',
        themes: ['light', 'dark'],
        autoGenerate: true,
        autoOpen: process.env.NODE_ENV === 'development',
        lightTheme: {
          showPerformanceMetrics: true,
          showStepDetails: true,
          maxFeaturesToShow: 50,
        },
        darkTheme: {
          showPerformanceMetrics: true,
          showStepDetails: true,
          maxFeaturesToShow: 50,
        },
      },
      testing: {
        defaultTimeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        verbose: false,
      },
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        maxRetries: 3,
        timeout: 10000,
      },
      reporting: {
        baseDir: './test-reports',
        cucumberJsonPath: './coverage/functional-tests/cucumber-report.json',
        includePerformanceMetrics: true,
        includeStepDetails: true,
        maxFeaturesToShow: 50,
      },
      ci: {
        environment: process.env.NODE_ENV || 'development',
        buildId: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
        branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME,
        commitHash: process.env.COMMIT_SHA || process.env.GITHUB_SHA,
        pullRequestNumber: process.env.PULL_REQUEST_NUMBER 
          ? parseInt(process.env.PULL_REQUEST_NUMBER, 10) 
          : undefined,
      },
    };
  }

  /**
   * Get current configuration
   */
  public getConfig(): AWSTestingFrameworkConfig {
    if (!this.config) {
      return this.autoDetectConfig();
    }
    return this.config;
  }

  /**
   * Get dashboard configuration
   */
  public getDashboardConfig(): NonNullable<AWSTestingFrameworkConfig['dashboard']> {
    const config = this.getConfig();
    return config.dashboard || this.getDefaultConfig().dashboard!;
  }

  /**
   * Get reporting configuration
   */
  public getReportingConfig(): NonNullable<AWSTestingFrameworkConfig['reporting']> {
    const config = this.getConfig();
    return config.reporting || this.getDefaultConfig().reporting!;
  }

  /**
   * Get CI configuration
   */
  public getCIConfig(): NonNullable<AWSTestingFrameworkConfig['ci']> {
    const config = this.getConfig();
    return config.ci || this.getDefaultConfig().ci!;
  }

  /**
   * Check if dashboard generation is enabled
   */
  public isDashboardEnabled(): boolean {
    const dashboardConfig = this.getDashboardConfig();
    return dashboardConfig.enabled !== false;
  }

  /**
   * Get configuration file path
   */
  public getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * Reset configuration (for testing)
   */
  public reset(): void {
    this.config = null;
    this.configPath = null;
  }
}
