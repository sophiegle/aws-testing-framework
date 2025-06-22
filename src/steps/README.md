# Step Definitions Organization

This directory contains the step definitions for the AWS Testing Framework, organized by functionality for better maintainability and navigation.

## File Structure

### `base-steps.ts`
Main entry point that imports all service-specific step files. This file serves as the index for all step definitions.

### Service-Specific Files

#### `s3-steps.ts`
Contains all S3-related step definitions:
- Basic S3 operations (bucket creation, file upload, file verification)
- File upload with tracking and correlation IDs
- Multiple file upload operations

#### `sqs-steps.ts`
Contains all SQS-related step definitions:
- Basic SQS operations (queue creation, message sending, message verification)

#### `lambda-steps.ts`
Contains all Lambda-related step definitions:
- Basic Lambda operations (function creation, invocation, response verification)
- Lambda execution tracking and verification
- Advanced Lambda verification (error checking, execution time, configuration validation)

#### `step-function-steps.ts`
Contains all Step Function-related step definitions:
- Basic Step Function operations (state machine creation, execution, status verification)
- Step Function execution tracking and verification
- Advanced Step Function verification (state completion, performance, definition validation)

### Cross-Service and Advanced Files

#### `correlation-steps.ts`
Contains step definitions for tracking data across multiple AWS services:
- Cross-service correlation verification
- File tracing through entire data pipelines
- Workflow state verification across services

#### `monitoring-steps.ts`
Contains step definitions for advanced monitoring and observability:
- CloudWatch logs verification (pattern matching, error detection, metrics analysis)
- Step Function state output verification (data validation, data flow analysis, SLA compliance)
- Performance monitoring and alerting

## Benefits of This Organization

1. **Maintainability**: Each file focuses on a specific area of functionality, making it easier to find and modify relevant steps
2. **Scalability**: New functionality can be added by creating new files without cluttering existing ones
3. **Team Collaboration**: Different team members can work on different functional areas without conflicts
4. **Code Navigation**: Developers can quickly locate steps related to specific functionality
5. **Testing**: Tests can be organized to match the step file structure

## Adding New Steps

When adding new step definitions:

1. **Identify the primary functionality** the step relates to
2. **Add the step to the appropriate file**:
   - AWS service operations → service-specific file (e.g., `s3-steps.ts`)
   - Cross-service tracking → `correlation-steps.ts`
   - Monitoring and observability → `monitoring-steps.ts`
3. **If the step involves multiple services**, consider adding it to `correlation-steps.ts`
4. **If the step is for advanced monitoring**, add it to `monitoring-steps.ts`
5. **Update this README** if you add a new file

## Import Order

The import order in `base-steps.ts` is important:
1. S3 steps (often the starting point of data pipelines)
2. SQS steps (message queuing)
3. Lambda steps (compute processing)
4. Step Function steps (orchestration)
5. Correlation steps (cross-service tracking)
6. Monitoring steps (advanced observability)

This order ensures that dependencies are properly resolved and steps are available when needed.

## Best Practices

1. **Keep files focused**: Each file should only contain steps for its specific functionality
2. **Use descriptive step names**: Step names should clearly indicate what they do
3. **Add comments**: Group related steps with comments for better organization
4. **Consistent error handling**: Use consistent error messages and validation patterns
5. **Documentation**: Update this README when adding new files or significant changes 