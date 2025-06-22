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
test: add unit tests for correlation tracking
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

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:unit:watch
```

### Test Coverage

Maintain high test coverage:
- **Unit tests**: 80%+ coverage
- **Integration tests**: Cover all major workflows
- **Mutation tests**: Ensure test quality

## Documentation

### Updating Documentation

When adding new features, update:

1. **API Documentation** (`docs/API.md`)
2. **Getting Started Guide** (`docs/GETTING_STARTED.md`)
3. **README.md** (if needed)
4. **Examples** (add new examples)

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add screenshots for UI components
- Keep documentation up to date
- Use proper markdown formatting

### Generating Documentation

```bash
# Generate API documentation
npm run docs:generate

# Build documentation
npm run docs:build
```

## Pull Request Process

### Before Submitting

1. **Test your changes**:
   ```bash
   npm run test:unit
   npm test
   npm run test:coverage
   ```

2. **Check code quality**:
   ```bash
   npm run check
   ```

3. **Update documentation** if needed

4. **Add tests** for new functionality

### Pull Request Template

Use the provided pull request template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Test addition
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Documentation updated
- [ ] Code quality checks pass

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
- [ ] New and existing unit tests pass locally
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Documentation review** if needed
4. **Final approval** before merge

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Creating a Release

1. **Update version**:
   ```bash
   npm version patch|minor|major
   ```

2. **Build and test**:
   ```bash
   npm run build
   npm test
   ```

3. **Publish**:
   ```bash
   npm publish
   ```

4. **Create GitHub release** with release notes

## Community

### Getting Help

- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check our comprehensive documentation

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Email**: [contact@sophiegle.dev](mailto:contact@sophiegle.dev)

### Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

## Areas for Contribution

### High Priority

- **Performance improvements**
- **Additional AWS service support**
- **Enhanced error handling**
- **Better documentation**
- **More examples**

### Medium Priority

- **New step definitions**
- **Reporting improvements**
- **CI/CD enhancements**
- **Testing utilities**

### Low Priority

- **Code refactoring**
- **Documentation updates**
- **Minor bug fixes**

## Getting Help

If you need help with contributing:

1. **Check existing issues** and discussions
2. **Read the documentation** thoroughly
3. **Ask questions** in GitHub Discussions
4. **Contact maintainers** for complex issues

Thank you for contributing to the AWS Testing Framework! 🚀 