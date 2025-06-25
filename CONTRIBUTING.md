# Contributing

Thank you for your interest in contributing to kioku! This document provides guidelines for contributing to this project.

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Run linting: `npm run xo`

## Semantic Versioning

This project uses **automatic semantic versioning** based on commit messages. When you push to the `main` branch, the CI/CD pipeline will:

1. **Analyze your commit messages** for semantic keywords
2. **Automatically bump the version** (patch/minor/major)
3. **Create a git tag** with the new version
4. **Publish to npm** with the new version
5. **Create a GitHub release** with changelog

### Commit Message Conventions

Use conventional commit messages to trigger automatic versioning:

#### Patch Release (1.0.0 → 1.0.1)
- `fix: resolve memory leak in cache`
- `docs: update README with new examples`
- `style: format code according to style guide`
- `refactor: simplify cache implementation`
- `test: add tests for edge cases`
- `chore: update dependencies`

#### Minor Release (1.0.0 → 1.1.0)
- `feat: add TTL support for cached items`
- `feature: implement cache size limits`

#### Major Release (1.0.0 → 2.0.0)
- `feat!: breaking change in API`
- `BREAKING CHANGE: remove deprecated methods`
- `feat: add new API (major)`

### Examples

```bash
# Patch release
git commit -m "fix: handle undefined function parameters"

# Minor release
git commit -m "feat: add cache expiration support"

# Major release
git commit -m "feat!: change default cache size to 1000"
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with appropriate commit messages
3. Ensure all tests pass: `npm test`
4. Ensure linting passes: `npm run xo`
5. Submit a pull request

## Code Style

This project uses:
- **TypeScript** for type safety
- **XO** for linting and formatting
- **AVA** for testing

Run `npm run xo` to check and fix code style issues.

## Testing

- Run tests: `npm test`
- Run tests in watch mode: `npm test -- --watch`
- Run specific test file: `npm test -- test.ts`

## Release Process

Releases are **fully automated**:

1. Push your changes to `main` branch
2. CI/CD analyzes commit messages for semantic versioning
3. Version is automatically bumped and tagged
4. Package is published to npm
5. GitHub release is created with changelog

**No manual version management required!**

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Getting Started

Before you begin contributing, please:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Install dependencies** (see [Development Setup](#development-setup))
4. **Create a feature branch** for your changes

## Development Setup

### Prerequisites

- Node.js 22 or higher
- npm or yarn

### Installation

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/kioku.git
cd kioku

# Install dependencies
npm install

# Run tests to ensure everything is working
npm test
```

### Available Scripts

- `npm test` - Run all tests (linting, unit tests, type checking)
- `npm run build` - Build the project
- `npm run lint` - Run linting only
- `npm run type-check` - Run TypeScript type checking

## Making Changes

### Code Style

We use [XO](https://github.com/xojs/xo) for linting and code formatting. The configuration is in `package.json`.

Key style guidelines:

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### TypeScript Guidelines

- Use strict TypeScript configuration
- Provide proper type annotations
- Use generic types where appropriate
- Avoid `any` type unless absolutely necessary
- Use union types and intersection types effectively

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat: add support for async generator functions`
- `fix(cache): handle undefined values correctly`
- `docs: update README with new examples`
- `test: add tests for edge cases`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- test-file.test.ts
```

### Writing Tests

- Write tests for all new functionality
- Include edge cases and error conditions
- Use descriptive test names
- Follow the existing test patterns
- Test both synchronous and asynchronous functions
- Test generator and async generator functions

### Test Structure

```typescript
import test from 'ava';
import { memoize } from '../index';

test('should memoize synchronous functions', (t) => {
  let callCount = 0;
  const fn = (x: number) => {
    callCount++;
    return x * 2;
  };

  const memoized = memoize(fn);

  t.is(memoized(5), 10);
  t.is(memoized(5), 10);
  t.is(callCount, 1);
});
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**: Run `npm test` and fix any issues
2. **Update documentation**: Add or update documentation as needed
3. **Check code style**: Ensure your code follows the project's style guidelines
4. **Test your changes**: Verify your changes work as expected

### Pull Request Guidelines

1. **Create a descriptive title** that summarizes the change
2. **Provide a detailed description** explaining what and why
3. **Include examples** if adding new features
4. **Reference related issues** using keywords like "Fixes #123"
5. **Add tests** for new functionality
6. **Update documentation** if needed

### Pull Request Template

```markdown
## Description

Brief description of the changes made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing

- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Additional Notes

Any additional information or context about the pull request.
```

## Code Style

### General Guidelines

- Use meaningful variable names
- Keep functions small and focused
- Use early returns to reduce nesting
- Prefer const over let when possible
- Use template literals for string interpolation

### TypeScript Specific

```typescript
// Good
interface CacheConfig {
  max?: number;
  ttl?: number;
}

// Good
type MemoizedResult<T> = T | Promise<T> | Generator<T, T, T>;

// Good
function memoize<T extends MemoizableFunction>(fn: T): T {
  // implementation
}
```

### Error Handling

- Use descriptive error messages
- Include context in error messages
- Handle edge cases gracefully
- Validate inputs appropriately

## Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include examples in documentation
- Document complex algorithms
- Explain non-obvious implementation details

### Example JSDoc

```typescript
/**
 * Creates a memoized version of the provided function.
 *
 * @param fn - The function to memoize
 * @returns The memoized function with the same signature as the original
 *
 * @example
 * ```typescript
 * const expensiveFunction = memoize((a: number, b: number) => a + b);
 * console.log(expensiveFunction(1, 2)); // 3
 * console.log(expensiveFunction(1, 2)); // 3 (cached)
 * ```
 */
export function memoize<T extends MemoizableFunction>(fn: T): T {
  // implementation
}
```

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Clear description** of the problem
2. **Steps to reproduce** the issue
3. **Expected behavior** vs actual behavior
4. **Environment information** (Node.js version, OS, etc.)
5. **Code example** that demonstrates the issue
6. **Error messages** or stack traces

### Issue Template

```markdown
## Bug Description

Clear and concise description of the bug.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- Node.js version: [e.g. 22.0.0]
- OS: [e.g. macOS 12.0]
- Kioku version: [e.g. 1.0.0]

## Additional Context

Any other context about the problem.
```

## Feature Requests

When requesting features, please:

1. **Describe the feature** clearly and concisely
2. **Explain the use case** and why it's needed
3. **Provide examples** of how it would be used
4. **Consider alternatives** and explain why this approach is preferred
5. **Check existing issues** to avoid duplicates

## Getting Help

If you need help with contributing:

- Check existing issues and pull requests
- Join our discussions in GitHub Issues
- Review the codebase to understand patterns
- Ask questions in GitHub Issues

## Recognition

Contributors will be recognized in:

- The project's README file
- Release notes
- GitHub contributors list

Thank you for contributing to Kioku! 🚀
