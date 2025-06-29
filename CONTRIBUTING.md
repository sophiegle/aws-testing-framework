# Contributing to AWS Testing Framework

Thank you for your interest in contributing to the AWS Testing Framework! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Community](#community)

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- **AWS CLI** configured (for integration tests)
- **TypeScript** knowledge
- **Cucumber/BDD** experience (helpful but not required)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/yourusername/aws-testing-framework.git
cd aws-testing-framework
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/sophiegle/aws-testing-framework.git
```

## Development Setup

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Run Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires AWS credentials)
npm test

# All tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint

# Check and fix code quality
npm run check
```

## Making Changes

### Branch Strategy

1. Create a feature branch from `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/your-feature-name
```

2. Make your changes
3. Commit with conventional commit messages
4. Push to your fork
5. Create a pull request

### Conventional Commits

Use conventional commit messages:

```
type(scope): description

feat: add new S3 step definitions
fix: resolve Lambda timeout issues
docs: update API documentation
test: add unit tests for performance monitoring
refactor: improve error handling
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test additions or changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use async/await for asynchronous operations
- Handle errors appropriately

### File Structure

```
src/
├── framework/          # Core framework classes
│   ├── services/      # AWS service classes
│   │   ├── S3Service.ts
│   │   ├── SQSService.ts
│   │   ├── LambdaService.ts
│   │   ├── StepFunctionService.ts
│   │   ├── PerformanceMonitor.ts
│   │   ├── StepContextManager.ts
│   │   └── HealthValidator.ts
│   ├── AWSTestingFramework.ts  # Main framework class
│   └── types.ts       # TypeScript interfaces
├── steps/             # Step definitions
├── reporting/         # Reporting utilities
└── index.ts          # Main entry point
```

## Testing

### Writing Tests

#### Unit Tests

Create unit tests for new functionality:

```typescript
// src/__tests__/framework/AWSTestingFramework.test.ts
describe('AWSTestingFramework', () => {
  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests

Add integration tests for AWS service interactions:

```gherkin
# features/new-feature.feature
Feature: New Feature
  Scenario: Test new functionality
    Given I have [prerequisites]
    When I [action]
    Then [verification]
```

#### Step Definitions

Add step definitions for new features:

```typescript
// src/steps/new-feature-steps.ts
import { Given, When, Then } from '@cucumber/cucumber';

Given('I have new prerequisites', async function() {
  // Implementation
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm run test:unit -- AWSTestingFramework.test.ts

# Run with coverage
npm run test:coverage

# Run mutation tests
npm run test:mutation
```

## Architecture Guidelines

### Service Classes

When adding new AWS service functionality:

1. **Create a dedicated service class** in `src/framework/services/`
2. **Follow the existing pattern**:
   ```typescript
   export class NewService {
     private client: NewServiceClient;
   
     constructor(client: NewServiceClient) {
       this.client = client;
     }
   
     async methodName(): Promise<Result> {
       // Implementation
     }
   }
   ```
3. **Add the service to the main framework** class
4. **Create comprehensive tests** for the service

### Step Definitions

When adding new step definitions:

1. **Create a new file** in `src/steps/` following the naming convention
2. **Use the framework instance** from the World context
3. **Add proper error handling** and logging
4. **Include both positive and negative test cases**

### Type Definitions

When adding new types:

1. **Add to `src/framework/types.ts`** for framework-related types
2. **Use descriptive names** and add JSDoc comments
3. **Consider reusability** across different parts of the framework

## Documentation

### API Documentation

- Add JSDoc comments to all public methods
- Include examples in comments
- Document error conditions and return types

### README Updates

- Update the main README.md for new features
- Add examples for new functionality
- Update the architecture section if needed

### Code Comments

- Use clear, concise comments
- Explain complex business logic
- Document AWS service-specific considerations

## Pull Request Process

1. **Ensure all tests pass** before submitting
2. **Update documentation** for any new features
3. **Follow the conventional commit format**
4. **Provide a clear description** of changes
5. **Include examples** if adding new functionality
6. **Reference any related issues**

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements (unless intentional)
```

## Release Process

1. **Update version** in package.json
2. **Update CHANGELOG.md** with new features/fixes
3. **Create a release tag**
4. **Publish to npm** (if applicable)

## Community

### Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas
- **Documentation**: Check the README and API docs first

### Code Reviews

- Be constructive and respectful
- Focus on the code, not the person
- Provide specific feedback and suggestions
- Ask questions when something is unclear

## Development Workflow

### Daily Development

1. **Pull latest changes**: `git pull upstream main`
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Make changes** and test locally
4. **Commit changes**: Use conventional commits
5. **Push and create PR**: `git push origin feature/your-feature`

### Before Submitting

- [ ] All tests pass
- [ ] Code is formatted (`npm run format`)
- [ ] Linting passes (`npm run lint`)
- [ ] Documentation is updated
- [ ] No sensitive data is committed

## Performance Considerations

When contributing performance-related features:

1. **Measure impact** with benchmarks
2. **Consider AWS costs** of additional API calls
3. **Optimize for common use cases**
4. **Document performance implications**

## Security Guidelines

1. **Never commit credentials** or sensitive data
2. **Use environment variables** for configuration
3. **Validate all inputs** to prevent injection attacks
4. **Follow AWS security best practices**

## Troubleshooting

### Common Issues

1. **AWS Credentials**: Ensure AWS CLI is configured
2. **TypeScript Errors**: Run `npm run build` to check for type issues
3. **Test Failures**: Check AWS service permissions and configuration
4. **Build Issues**: Clear node_modules and reinstall dependencies

### Getting Help

If you encounter issues:

1. Check existing issues and discussions
2. Search the documentation
3. Create a new issue with detailed information
4. Include error messages and environment details

Thank you for contributing to the AWS Testing Framework! 🚀 