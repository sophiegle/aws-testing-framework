# Step Definitions Organization

This directory contains the step definitions for the AWS Testing Framework, organized by AWS service for better maintainability and navigation.

## File Structure

### `base-steps.ts`
Main entry point that imports all service-specific step files. This file serves as the index for all step definitions.

### Service-Specific Files

#### `s3-steps.ts`
Contains all S3-related step definitions:
- Basic S3 operations (bucket creation, file upload, file verification)
- Workflow-specific S3 operations (file upload with tracking, multiple file uploads)

#### `sqs-steps.ts`
Contains all SQS-related step definitions:
- Basic SQS operations (queue creation, message sending, message verification)

#### `lambda-steps.ts`
Contains all Lambda-related step definitions:
- Basic Lambda operations (function creation, invocation, response verification)
- Workflow-specific Lambda operations (SQS message consumption, Step Function triggering)
- Advanced Lambda verification (error checking, execution time, configuration validation)

#### `step-function-steps.ts`
Contains all Step Function-related step definitions:
- Basic Step Function operations (state machine creation, execution, status verification)
- Workflow-specific Step Function operations (file reference verification, execution tracking)
- Advanced Step Function verification (state completion, performance, definition validation)

#### `workflow-steps.ts`
Contains end-to-end workflow step definitions:
- Workflow setup and expectations
- Cross-service correlation verification
- File tracing through entire workflows

#### `verification-steps.ts`
Contains advanced verification step definitions:
- CloudWatch logs verification (pattern matching, error detection, metrics analysis)
- Step Function state output verification (data validation, data flow analysis, SLA compliance)

## Benefits of This Organization

1. **Maintainability**: Each file focuses on a specific AWS service, making it easier to find and modify relevant steps
2. **Scalability**: New services can be added by creating new files without cluttering existing ones
3. **Team Collaboration**: Different team members can work on different service files without conflicts
4. **Code Navigation**: Developers can quickly locate steps related to specific AWS services
5. **Testing**: Service-specific tests can be organized to match the step file structure

## Adding New Steps

When adding new step definitions:

1. **Identify the AWS service** the step relates to
2. **Add the step to the appropriate service file** (e.g., new S3 steps go in `s3-steps.ts`)
3. **If the step involves multiple services**, consider adding it to `workflow-steps.ts`
4. **If the step is for advanced verification**, add it to `verification-steps.ts`
5. **Update this README** if you add a new service file

## Import Order

The import order in `base-steps.ts` is important:
1. S3 steps (often the starting point of workflows)
2. SQS steps (message queuing)
3. Lambda steps (compute processing)
4. Step Function steps (orchestration)
5. Workflow steps (end-to-end verification)
6. Verification steps (advanced monitoring)

This order ensures that dependencies are properly resolved and steps are available when needed.

## Best Practices

1. **Keep service files focused**: Each file should only contain steps for its specific AWS service
2. **Use descriptive step names**: Step names should clearly indicate what they do
3. **Add comments**: Group related steps with comments for better organization
4. **Consistent error handling**: Use consistent error messages and validation patterns
5. **Documentation**: Update this README when adding new files or significant changes 