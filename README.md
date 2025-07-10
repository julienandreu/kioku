# Kioku (記憶)

> **Memory in Japanese** - A powerful and flexible memoization library for TypeScript/JavaScript

[![npm version](https://badge.fury.io/js/kioku.svg)](https://badge.fury.io/js/kioku)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

Kioku is a comprehensive memoization library that supports synchronous functions, asynchronous functions (Promises), generator functions, and async generator functions. It provides configurable caching with LRU eviction and TTL, along with full TypeScript support.

## Features

- 🚀 **High Performance**: Optimized caching with LRU eviction
- 🔄 **Async Support**: Memoize Promise-returning functions and async generators
- 🎯 **Generator Support**: Cache generator and async generator functions
- ⚡ **TypeScript First**: Full type safety with comprehensive TypeScript support
- 🎛️ **Configurable**: Customizable cache size, TTL, and eviction policies
- 🧹 **Memory Safe**: Automatic cleanup and memory management
- 📊 **Observable**: Cache statistics and monitoring capabilities

## Installation

```bash
npm install kioku
```

## Quick Start

```typescript
import { memoize, setup, clearCache, getCacheStats } from 'kioku';

// Basic usage
const expensiveFunction = memoize((a: number, b: number) => {
  console.log('Computing...');
  return a + b;
});

console.log(expensiveFunction(1, 2)); // Computing... 3
console.log(expensiveFunction(1, 2)); // 3 (cached)

// Configure cache
setup({ max: 1000, ttl: 60000 });

// Get cache statistics
const stats = getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.max}`);

// Clear cache
clearCache();
```

## Usage Examples

### Synchronous Functions

```typescript
import { memoize } from 'kioku';

const fibonacci = memoize((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

console.log(fibonacci(40)); // Fast due to memoization
```

### Asynchronous Functions

```typescript
import { memoize } from 'kioku';

const fetchUserData = memoize(async (userId: string) => {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
});

// First call fetches data
const user1 = await fetchUserData('123');

// Second call returns cached result
const user2 = await fetchUserData('123');
```

### Generator Functions

```typescript
import { memoize } from 'kioku';

const numberGenerator = memoize(function* (start: number, count: number) {
  for (let i = 0; i < count; i++) {
    yield start + i;
  }
});

const gen1 = numberGenerator(1, 5);
const gen2 = numberGenerator(1, 5); // Returns cached generator
```

### Complex Objects and Parameters

```typescript
import { memoize } from 'kioku';

const processUser = memoize((user: { id: string; name: string }, options: { verbose?: boolean }) => {
  console.log(`Processing user: ${user.name}`);
  return { processed: true, userId: user.id };
});

const user = { id: '123', name: 'John' };
const options = { verbose: true };

processUser(user, options); // Processing user: John
processUser(user, options); // Cached result
```

## API Reference

### `memoize<T>(fn: T): T`

Creates a memoized version of the provided function.

**Parameters:**
- `fn`: The function to memoize (supports sync, async, generator, and async generator functions)

**Returns:** The memoized function with the same signature as the original

### `setup(options?: CacheConfig): void`

Configures the global cache settings.

**Parameters:**
- `options.max` (optional): Maximum number of cache entries (default: 100)
- `options.ttl` (optional): Time to live for cache entries in milliseconds (default: 300000)

### `clearCache(): void`

Clears all entries from the cache.

### `getCacheStats(): CacheStats`

Returns statistics about the current cache state.

**Returns:**
- `size`: Current number of entries in the cache
- `max`: Maximum number of entries the cache can hold

## Advanced Usage

### Custom Cache Configuration

```typescript
import { setup } from 'kioku';

// Configure cache with custom settings
setup({
  max: 500,        // Maximum 500 entries
  ttl: 30000       // 30 seconds TTL
});
```

### Cache Statistics

```typescript
import { getCacheStats } from 'kioku';

const stats = getCacheStats();
console.log(`Cache utilization: ${stats.size}/${stats.max}`);
console.log(`Usage percentage: ${(stats.size / stats.max * 100).toFixed(1)}%`);
```

### Memory Management

```typescript
import { clearCache } from 'kioku';

// Clear cache when memory usage is high
if (process.memoryUsage().heapUsed > threshold) {
  clearCache();
}
```

## Performance Considerations

- **Memory Usage**: Cache entries consume memory. Use appropriate `max` values for your use case.
- **TTL Settings**: Set reasonable TTL values to prevent stale data.
- **Function Complexity**: Memoization overhead is minimal for expensive functions.
- **Parameter Serialization**: Complex objects are serialized for caching, which has a small performance cost.

## Browser Support

Kioku works in all modern browsers that support:
- ES2015+ features
- Promise API
- Generator functions

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## License

MIT © [Julien Andreu](https://github.com/julienandreu)

## Related

- [p-memoize](https://github.com/sindresorhus/p-memoize) - Memoize promise-returning & async functions
- [memoizee](https://github.com/medikoo/memoizee) - Complete memoize/cache solution for JavaScript
- [fast-memoize](https://github.com/caiogondim/fast-memoize.js) - Fastest possible memoization library
