export interface AWSConfig {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  profile?: string;
  endpoint?: string;
  maxRetries?: number;
  timeout?: number;
}

export interface FrameworkConfig {
  aws?: AWSConfig;
  defaultTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  testDataDir?: string;
  lambda?: {
    /** Default timeout for Lambda invocations in milliseconds */
    defaultInvocationTimeout?: number;
    /** Maximum timeout for Lambda invocations in milliseconds */
    maxInvocationTimeout?: number;
  };
}

export interface StepContext {
  bucketName?: string;
  queueUrl?: string;
  queueName?: string;
  functionName?: string;
  stateMachineArn?: string;
  executionArn?: string;
  stateMachineName?: string;
  expectedStateMachineName?: string;
  uploadedFileName?: string;
  uploadedFileContent?: string;
  lastError?: Error;
  loggingEnabled?: boolean;
  customConfiguration?: boolean;
}

export interface ExecutionDetails {
  executionArn: string;
  stateMachineArn: string;
  status: string;
  startDate: Date;
  stopDate?: Date;
  input?: string;
  output?: string;
}

export interface PerformanceMetrics {
  operationName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
  retryCount: number;
  awsService: string;
}

export interface TestMetrics {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  slowestOperation: PerformanceMetrics | null;
  fastestOperation: PerformanceMetrics | null;
  errorRate: number;
  retryRate: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  awsSetup: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  performance: {
    totalOperations: number;
    errorRate: number;
    averageResponseTime: number;
  };
  resources: {
    activeExecutions: number;
    contextEntries: number;
  };
}

export interface AWSSetupValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  services: {
    s3: boolean;
    sqs: boolean;
    lambda: boolean;
    stepFunctions: boolean;
    cloudWatch: boolean;
  };
}

export interface StepFunctionExecutionResult {
  success: boolean;
  completedStates: string[];
  failedStates: string[];
  executionTime: number;
}

export interface StepFunctionPerformance {
  totalExecutionTime: number;
  averageStateExecutionTime: number;
  slowestState: string | null;
  fastestState: string | null;
}

export interface StepFunctionDefinition {
  isValid: boolean;
  hasStartState: boolean;
  hasEndStates: boolean;
  stateCount: number;
  errors: string[];
}

export interface StepFunctionStateOutput {
  stateName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  timestamp: Date;
  type: string;
}

export interface StepFunctionStateOutputVerification {
  matches: boolean;
  actualOutput: Record<string, unknown>;
  missingFields: string[];
  extraFields: string[];
}

export interface StepFunctionDataFlow {
  dataFlow: Array<{
    fromState: string;
    toState: string;
    dataTransformation: Record<string, unknown>;
    timestamp: Date;
  }>;
  dataLoss: boolean;
  dataCorruption: boolean;
}

export interface StepFunctionSLAs {
  maxTotalExecutionTime?: number;
  maxStateExecutionTime?: number;
  maxColdStartTime?: number;
}

export interface StepFunctionSLAVerification {
  meetsSLAs: boolean;
  violations: string[];
  metrics: {
    totalExecutionTime: number;
    maxStateExecutionTime: number;
    coldStartTime: number;
  };
}

export interface CleanupOptions {
  clearContext?: boolean;
  clearMetrics?: boolean;
  clearExecutions?: boolean;
  generateReport?: boolean;
}

export interface ContextValidation {
  isValid: boolean;
  missingKeys: (keyof StepContext)[];
  presentKeys: (keyof StepContext)[];
}
