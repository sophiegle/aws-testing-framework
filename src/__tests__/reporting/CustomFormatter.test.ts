import { EventEmitter } from 'node:events';
import type { IFormatterOptions } from '@cucumber/cucumber';
import CustomFormatter from '../../reporting/CustomFormatter';
import { TestReporter } from '../../reporting/TestReporter';

// Mock TestReporter
jest.mock('../../reporting/TestReporter');

describe('CustomFormatter', () => {
  let formatter: CustomFormatter;
  let mockReporter: jest.Mocked<TestReporter>;
  let mockEventDataCollector: unknown;

  beforeEach(() => {
    mockReporter = new TestReporter() as jest.Mocked<TestReporter>;
    mockEventDataCollector = {
      getTestCaseAttempts: jest.fn(),
      getTestCaseAttempt: jest.fn(),
      getFeatureData: jest.fn(),
      getStepData: jest.fn(),
      getFunctionName: jest.fn(),
      getStepParameterNames: jest.fn(),
      undefinedParameterTypes: [],
      parallelCanAssign: jest.fn(),
    } as unknown;

    // parameterTypes iterator mock
    const parameterTypesIterator = {
      next: () => ({ done: true, value: undefined }),
      [Symbol.iterator]: function () {
        return this;
      },
    };

    // Create mock support code library
    const _mockSupportCodeLibrary = {
      afterTestCaseHookDefinitions: [],
      afterTestRunHookDefinitions: [],
      beforeTestCaseHookDefinitions: [],
      beforeTestRunHookDefinitions: [],
      beforeTestStepHookDefinitions: [],
      afterTestStepHookDefinitions: [],
      defaultTimeout: 0,
      parameterTypeRegistry: {
        parameterTypeToSource: new Map(),
        defineSourcedParameterType: jest.fn(),
        lookupSource: jest.fn(),
        parameterTypeByName: new Map(),
        parameterTypes: parameterTypesIterator,
        parameterTypesByRegexp: new Map(),
        defineParameterType: jest.fn(),
        lookupByTypeName: jest.fn(),
        lookupByRegexp: jest.fn(),
        lookupByFunctionName: jest.fn(),
        [Symbol.iterator]: function* () {},
      },
      stepDefinitions: [],
      World: jest.fn(),
      originalCoordinates: {
        requireModules: [],
        requirePaths: [],
        importPaths: [],
        loaders: [],
      },
      undefinedParameterTypes: [],
      parallelCanAssign: jest.fn(),
    } as unknown;

    // Create mock options
    const mockOptions: IFormatterOptions = {
      // @ts-expect-error: Cucumber type is not mockable
      eventDataCollector: mockEventDataCollector,
      eventBroadcaster: new EventEmitter(),
      log: jest.fn(),
      parsedArgvOptions: {},
      stream: process.stdout,
      cleanup: jest.fn(),
      // @ts-expect-error: Cucumber type is not mockable
      snippetBuilder: {
        build: jest.fn(),
        snippetSyntax: jest.fn(),
        cucumberExpressionGenerator: jest.fn(),
        getFunctionName: jest.fn(),
        getStepParameterNames: jest.fn(),
      },
      colorFns: {
        forStatus: jest.fn(),
        location: jest.fn(),
        errorMessage: jest.fn(),
        errorStack: jest.fn(),
        tag: jest.fn(),
        diffAdded: jest.fn(),
        diffRemoved: jest.fn(),
      },
      cwd: process.cwd(),
    };

    formatter = new CustomFormatter(mockOptions, mockReporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new instance', () => {
    expect(formatter).toBeInstanceOf(CustomFormatter);
  });

  it('should handle test run finished event', () => {
    formatter.onTestRunFinished({} as IFormatterOptions);
    expect(mockReporter.onTestRunFinished).toHaveBeenCalled();
  });

  it('should handle feature started event', () => {
    const feature = { name: 'Test Feature' };
    formatter.onFeatureStarted(feature);
    expect(mockReporter.onFeatureStarted).toHaveBeenCalledWith(feature);
  });

  it('should handle scenario started event', () => {
    const scenario = { name: 'Test Scenario' };
    formatter.onScenarioStarted(scenario);
    expect(mockReporter.onScenarioStarted).toHaveBeenCalledWith(scenario);
  });

  it('should handle step finished event', () => {
    const step = { text: 'Test Step' };
    const result = { status: 'passed', duration: 100 };
    formatter.onStepFinished(step, result);
    expect(mockReporter.onStepFinished).toHaveBeenCalledWith(step, result);
  });

  it('should handle scenario finished event', () => {
    const scenario = { name: 'Test Scenario' };
    const result = { status: 'passed', duration: 100 };
    formatter.onScenarioFinished(scenario, result);
    expect(mockReporter.onScenarioFinished).toHaveBeenCalledWith(
      scenario,
      result
    );
  });
});
