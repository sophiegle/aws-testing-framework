import { ConfigManager } from '../../config/ConfigManager';
import { ServiceContainer } from '../container/ServiceContainer';
import { StepDefinitionFactory } from '../container/StepDefinitionFactory';
import type { FrameworkConfig } from '../types';

// Global service container instance
let globalContainer: ServiceContainer | null = null;
let stepFactory: StepDefinitionFactory | null = null;

/**
 * Initialize the global service container
 * This should be called before any step definitions are used
 */
export function initializeFramework(config?: FrameworkConfig): void {
  // If already initialized with the same config, don't reinitialize
  if (globalContainer && !config) {
    return;
  }

  // Dispose of existing container if present
  if (globalContainer) {
    globalContainer.dispose().catch(() => {
      // Silently handle disposal errors to prevent cascading issues
    });
  }

  globalContainer = new ServiceContainer(config);
  stepFactory = new StepDefinitionFactory(globalContainer);

  // Register all step definitions
  registerAllSteps();
}

/**
 * Get the global service container
 */
export function getContainer(): ServiceContainer {
  if (!globalContainer) {
    // Lazy initialization for backward compatibility
    initializeFramework();
  }
  if (!globalContainer) {
    throw new Error('Framework initialization failed');
  }
  return globalContainer;
}

/**
 * Get the step definition factory
 */
export function getStepFactory(): StepDefinitionFactory {
  if (!stepFactory) {
    // Lazy initialization for backward compatibility
    initializeFramework();
  }
  if (!stepFactory) {
    throw new Error('Framework initialization failed');
  }
  return stepFactory;
}

/**
 * Dispose of the global framework
 */
export async function disposeFramework(): Promise<void> {
  if (globalContainer) {
    try {
      await globalContainer.dispose();
    } catch {
      // Silently handle disposal errors to prevent cascading issues
    } finally {
      globalContainer = null;
      stepFactory = null;
    }
  }
}

/**
 * Register all step definitions
 */
function registerAllSteps(): void {
  if (!stepFactory) {
    throw new Error('Step factory not initialized');
  }

  const steps = stepFactory.createAllSteps();

  // Register all step definitions
  steps.s3Steps.registerSteps();
  steps.sqsSteps.registerSteps();
  steps.lambdaSteps.registerSteps();
  steps.stepFunctionSteps.registerSteps();
}

/**
 * Convert AWSTestingFrameworkConfig to FrameworkConfig format
 */
function convertConfigToFrameworkConfig(
  config: ReturnType<typeof ConfigManager.prototype.autoDetectConfig>
): FrameworkConfig {
  return {
    aws: config.aws,
    defaultTimeout: config.testing?.defaultTimeout,
    retryAttempts: config.testing?.retryAttempts,
    retryDelay: config.testing?.retryDelay,
    enableLogging: config.testing?.verbose,
    logLevel: config.testing?.verbose ? 'debug' : 'info',
    lambda: config.lambda,
  };
}

/**
 * Auto-initialize framework when explicitly requested
 * Call this function to enable auto-initialization for standalone usage
 */
export function enableAutoInitialization(): void {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    // Auto-load config from aws-testing-framework.config.json if it exists
    try {
      const configManager = ConfigManager.getInstance();
      const configFile = configManager.autoDetectConfig();
      const frameworkConfig = convertConfigToFrameworkConfig(configFile);
      initializeFramework(frameworkConfig);
    } catch {
      // If config loading fails, use defaults
      initializeFramework();
    }
  }
}

/**
 * Check if the framework has been initialized
 */
export function isFrameworkInitialized(): boolean {
  return globalContainer !== null;
}
