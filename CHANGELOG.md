# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.3] - 2025-11-19

### ✨ Added
- **Auto-load config file**: `aws-testing-framework.config.json` now automatically loads when framework initializes
  - Works when using the library from another project
  - Searches up directory tree from `process.cwd()`
  - Supports multiple config file name variations (`.js`, `.json`, etc.)

### 🔧 Changed
- **Simplified Lambda timeout configuration**: Consolidated 3 separate timeout configs into a single field
  - Removed: `defaultInvocationTimeout`, `maxInvocationTimeout`, `invocationVerificationTimeout`
  - Added: `lambda.timeout` (default: 300000ms = 5 minutes)
  - Environment variable updated: `LAMBDA_INVOCATION_TIMEOUT_MS` → `LAMBDA_TIMEOUT_MS`
- **Increased Lambda invocation verification timeout**: Default timeout for "the Lambda function should be invoked" step increased from 30s to 60s to handle CloudWatch log propagation delays in CI environments
- AWS Lambda max timeout (15 minutes) still enforced via hardcoded validation

### 📚 Documentation
- Updated example config files to use simplified Lambda timeout configuration

---

## [0.6.2] - 2025-11-19

### 🐛 Fixed
- Enabled Step Function state output verification step definition (`verifyStepFunctionStateOutput`)
- Enabled Step Function execution completion verification step definition (`verifyStepFunctionExecutionSuccess`)
- Fixed security vulnerabilities in `glob` (10.4.5 → 10.5.0) and `js-yaml` (3.14.1 → 3.14.2)
- Resolved all known security vulnerabilities (0 vulnerabilities remaining)

---

## [0.6.1] - 2025-10-19

### 📚 Documentation

#### Added
- **GETTING_STARTED.md** - Comprehensive onboarding guide for new users
  - Complete setup walkthrough (15 minutes to first test)
  - CloudFormation template for AWS infrastructure
  - Troubleshooting guide with common issues
  - Learning path from beginner to expert (4 levels)
  - Real-world usage examples and best practices

#### Changed
- Simplified Quick Start section in README
- Added prominent link to Getting Started guide
- Updated documentation links and resources
- Improved first-run experience documentation

### 🐛 Fixed
- Auto-initialization of step definitions for Cucumber
- Step definitions now properly registered when module loads

---

## [0.6.0] - 2025-10-19

### 🎉 Major Improvements

#### Test Coverage
- **Increased overall test coverage from 19.07% to 48.04%** (+28.97%)
- Added **312 new comprehensive tests** (48 → 360 total tests)
- All critical services and step definitions now well-tested

#### Services Layer (7.5% → 71.18%)
- **HealthValidator**: 22.91% → 97.91% coverage (+28 tests)
- **StepContextManager**: 0% → 100% coverage (+48 tests)  
- **SQSService**: 0% → 100% coverage (+20 tests)
- **LambdaService**: ~30% → 89.13% coverage (+52 tests)
- **S3Service**: ~30% → 91.66% coverage (+24 tests)
- **StepFunctionService**: ~50% → 59.42% coverage (+41 tests)

#### Steps Layer (37.82% → 84.34%)
- **LambdaSteps**: 0% → 92.85% coverage (+54 tests)
- **S3Steps**: 5.45% → 100% coverage (+29 tests)
- **SQSSteps**: 10.71% → 100% coverage (+25 tests)
- **StepFunctionSteps**: 9.09% → 100% coverage (+30 tests)

### ✨ Added

- Comprehensive unit tests for all step definition classes
- Comprehensive unit tests for all service classes
- Full test coverage for TestDataGenerator utility (100%)
- Full test coverage for reporting components (85.86%)
- Test coverage for AWSTestingFramework core (94.59%)

### 🔧 Changed

- **Breaking**: Removed `MonitoringSteps` class (was not aligned with service-based architecture)
- **Breaking**: Removed `PerformanceMonitor` service (deemed unnecessary for v1.0.0)
- Moved `BaseStepDefinition` to dedicated file to resolve circular dependency
- Updated Biome linter to version 2.2.4 for consistency with CI
- Fixed all linting issues for strict type safety compliance
- Removed test files from TypeScript compilation in pre-commit hooks

### 🐛 Fixed

- Fixed `parseInt()` calls to include radix parameter (Biome lint compliance)
- Fixed `forEach` callbacks to not return values (Biome lint compliance)
- Fixed circular dependency in step definition imports
- Fixed test assertions to match actual implementation behavior
- Fixed AWS SDK mock types in service tests
- Resolved all type safety issues - zero `any` types, zero non-null assertions

### 📚 Documentation

- Enhanced README with better architecture documentation
- Removed outdated references to deleted components
- Improved code organization and maintainability

### 🔒 Security

- Maintained strict type safety throughout codebase
- All new code follows TypeScript best practices
- Zero TypeScript or linter errors

### 📦 Internal

- All tests use properly typed Jest mocks
- Implemented safe helper functions for test step retrieval
- Enhanced mock patterns for better type inference
- Added comprehensive edge case and error handling tests

---

## [0.5.0] - 2024-10-18

### Initial Release

- Core AWS service support (S3, SQS, Lambda, Step Functions)
- CloudWatch log integration
- BDD/Cucumber step definitions
- CLI tools (init, doctor, configure, steps discovery)
- Test reporting and dashboard generation
- TypeScript support with comprehensive type definitions

---

## Future Releases

### [Unreleased]

Planned features for future releases:

- Correlation tracking system (filename-based and correlation ID-based)
- LogType: 'Tail' optimization for Lambda testing
- Complete Step Function service implementations
- DynamoDB support
- Enhanced error messages and debugging
- Performance optimizations

See `CORRELATION_TRACKING_DESIGN.md` for detailed feature design documents.

---

[0.6.0]: https://github.com/sophiegle/aws-testing-framework/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/sophiegle/aws-testing-framework/releases/tag/v0.5.0

