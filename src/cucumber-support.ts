/**
 * Cucumber support file for AWS Testing Framework
 * This initializes the DI container and registers all step definitions
 */

import { After, Before, setDefaultTimeout } from '@cucumber/cucumber';
// Import the framework initialization
import {
  disposeFramework,
  getContainer,
  initializeFramework,
} from './framework/steps/base-steps';
import type { StepContext } from './framework/types';

// Set default timeout
setDefaultTimeout(30000);

/**
 * Before hook - Initialize framework before each scenario
 */
Before(async function (this: StepContext) {
  // Initialize the framework with default configuration
  initializeFramework();

  // Attach the container to the World context for step definitions
  this.container = getContainer();
});

/**
 * After hook - Clean up after each scenario
 */
After(async function (this: StepContext) {
  // Dispose of the framework to clean up resources
  await disposeFramework();

  // Clear the container reference
  this.container = undefined;
});
