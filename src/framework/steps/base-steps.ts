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
  if (globalContainer) {
    globalContainer.dispose();
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
    throw new Error(
      'Framework not initialized. Call initializeFramework() first.'
    );
  }
  return globalContainer;
}

/**
 * Get the step definition factory
 */
export function getStepFactory(): StepDefinitionFactory {
  if (!stepFactory) {
    throw new Error(
      'Framework not initialized. Call initializeFramework() first.'
    );
  }
  return stepFactory;
}

/**
 * Dispose of the global framework
 */
export async function disposeFramework(): Promise<void> {
  if (globalContainer) {
    await globalContainer.dispose();
    globalContainer = null;
    stepFactory = null;
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

// Auto-initialize framework when module is loaded for Cucumber
// This ensures steps are registered before Cucumber parses feature files
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
