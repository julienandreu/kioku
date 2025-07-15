/**
 * @fileoverview Kioku - A powerful and flexible memoization library for TypeScript/JavaScript
 *
 * This module provides a comprehensive memoization solution that supports:
 * - Synchronous functions
 * - Asynchronous functions (Promises)
 * - Generator functions
 * - Async generator functions
 * - Complex parameter types (objects, symbols, undefined, etc.)
 * - Configurable caching with LRU eviction and TTL
 * - Type safety with full TypeScript support
 *
 * The library uses a sophisticated caching mechanism that handles edge cases
 * like undefined values, symbols, and object references while maintaining
 * type safety and performance.
 *
 * @example
 * ```typescript
 * import { memoize, setup, clearCache, getCacheStats } from 'kioku';
 *
 * // Basic usage
 * const expensiveFunction = memoize((a: number, b: number) => a + b);
 *
 * // Configure cache
 * setup({ max: 1000, ttl: 60000 });
 *
 * // Get cache statistics
 * const stats = getCacheStats();
 * console.log(`Cache size: ${stats.size}/${stats.max}`);
 *
 * // Clear cache
 * clearCache();
 * ```
 */

import {LRUCache} from 'lru-cache';
import mimicFunction from 'mimic-function';

/**
 * Serialized cache key type used internally for LRU cache storage.
 * This is a template literal type that represents the serialized form
 * of function identifier and arguments.
 */
type SerializedCacheKey = `{"identifier":${string},"args":${string}}`;

/**
 * Union type representing all possible return types that can be memoized.
 * Includes synchronous values, Promises, Generators, and AsyncGenerators.
 */
type MemoizedResult<T> = T | Promise<T> | Generator<T, T, T> | AsyncGenerator<T, T, T>;

/**
 * Type representing any function that can be memoized.
 * This includes functions that return any of the MemoizedResult types.
 */
type MemoizableFunction<T = unknown> = (...arguments_: any[]) => MemoizedResult<T>;

/**
 * Configuration options for the cache system.
 *
 * @property {number} [max=100] - Maximum number of entries in the cache
 * @property {number} [ttl=300000] - Time to live for cache entries in milliseconds (5 minutes)
 */
type CacheConfig = {
	max?: number;
	ttl?: number;
};

/**
 * Statistics about the current cache state.
 *
 * @property {number} size - Current number of entries in the cache
 * @property {number} max - Maximum number of entries the cache can hold
 */
type CacheStats = {
	size: number;
	max: number;
};

/**
 * Symbol used internally to represent undefined values in the cache.
 * Since undefined cannot be serialized properly, we use this symbol as a placeholder.
 */
const undefinedValue = Symbol('undefined');

/**
 * Default cache configuration options.
 * Provides sensible defaults for most use cases.
 */
const defaultOptions = {
	max: 100,
	ttl: 1000 * 60 * 5, // 5 minutes
} as const;

/**
 * Global LRU cache instance that stores memoized function results.
 * This cache can be reconfigured using the setup() function.
 */
let cache = new LRUCache<SerializedCacheKey, any>(defaultOptions);

/**
 * Converts undefined values to a special symbol for cache storage.
 * This is necessary because undefined cannot be properly serialized
 * and distinguished from missing values in the cache.
 *
 * @param value - The value to potentially convert
 * @returns The original value or undefinedValue symbol if the input was undefined
 *
 * @example
 * ```typescript
 * marshallUndefined(undefined) // Returns undefinedValue symbol
 * marshallUndefined("hello")   // Returns "hello"
 * marshallUndefined(42)        // Returns 42
 * ```
 */
function marshallUndefined(value: unknown): unknown {
	return value === undefined ? undefinedValue : value;
}

/**
 * Converts the special undefined symbol back to undefined for return values.
 * This is the inverse operation of marshallUndefined().
 *
 * @param value - The value to potentially convert
 * @returns The original value or undefined if the input was the undefinedValue symbol
 *
 * @example
 * ```typescript
 * unmarshallUndefined(undefinedValue) // Returns undefined
 * unmarshallUndefined("hello")        // Returns "hello"
 * unmarshallUndefined(42)             // Returns 42
 * ```
 */
function unmarshallUndefined(value: unknown): unknown {
	return value === undefinedValue ? undefined : value;
}

/**
 * Type guard to check if a value is a Promise.
 *
 * @param value - The value to check
 * @returns True if the value is a Promise, false otherwise
 *
 * @example
 * ```typescript
 * isPromise(Promise.resolve(42)) // true
 * isPromise(42)                  // false
 * isPromise("hello")             // false
 * ```
 */
function isPromise(value: unknown): value is Promise<unknown> {
	return value instanceof Promise;
}

/**
 * Type guard to check if a value is a Generator.
 * Distinguishes between regular generators and async generators.
 *
 * @param value - The value to check
 * @returns True if the value is a Generator, false otherwise
 *
 * @example
 * ```typescript
 * function* gen() { yield 1; }
 * isGenerator(gen()) // true
 * isGenerator(42)    // false
 * ```
 */
function isGenerator(value: unknown): value is Generator<unknown, unknown, unknown> {
	return Boolean(value
		&& typeof value === 'object'
		&& 'next' in value
		&& typeof (value as Generator).next === 'function'
		&& !(Symbol.asyncIterator in value));
}

/**
 * Type guard to check if a value is an AsyncGenerator.
 * Distinguishes between regular generators and async generators.
 *
 * @param value - The value to check
 * @returns True if the value is an AsyncGenerator, false otherwise
 *
 * @example
 * ```typescript
 * async function* asyncGen() { yield 1; }
 * isAsyncGenerator(asyncGen()) // true
 * isGenerator(gen())           // false
 * ```
 */
function isAsyncGenerator(value: unknown): value is AsyncGenerator<unknown, unknown, unknown> {
	return Boolean(value
		&& typeof value === 'object'
		&& 'next' in value
		&& typeof (value as AsyncGenerator).next === 'function'
		&& Symbol.asyncIterator in value);
}

/**
 * WeakMap that stores argument-to-cache-key mappings for each memoized function.
 * This avoids the need to serialize complex objects and allows for proper
 * handling of symbols, functions, and object references.
 */
const functionArgumentsKeyMap = new WeakMap<MemoizableFunction, Map<string, unknown>>();

/**
 * Creates a stable string representation of function arguments for cache key generation.
 * Handles primitive types, symbols, functions, objects, and special values like undefined/null.
 *
 * @param arguments_ - Array of function arguments to serialize
 * @returns A stable string representation of the arguments
 *
 * @example
 * ```typescript
 * getArgumentsKey(['hello', 42, undefined]) // Returns "hello|42|@@undefined"
 * getArgumentsKey([Symbol('test')])         // Returns "@@symbol:test"
 * getArgumentsKey([{foo: 'bar'}])          // Returns "@@object:[object Object]:Object:[object Object]"
 * ```
 */
function getArgumentsKey(arguments_: unknown[]): string {
	// Use a stable string representation for primitive types, and unique object references for objects/symbols
	return arguments_.map(argument => {
		if (typeof argument === 'symbol') {
			return `@@symbol:${argument.description ?? ''}:${argument.toString()}`;
		}

		if (typeof argument === 'function') {
			return `@@function:${argument.name || 'anonymous'}`;
		}

		if (argument === undefined) {
			return '@@undefined';
		}

		if (argument === null) {
			return '@@null';
		}

		if (typeof argument === 'object') {
			// Use the object's reference as a unique identifier
			const uniqueIdentifier = Symbol.toStringTag in argument ? String(argument[Symbol.toStringTag]) : '';

			return `@@object:${Object.prototype.toString.call(argument)}:${uniqueIdentifier}:${Object.prototype.toString.call(argument)}`;
		}

		// eslint-disable-next-line @typescript-eslint/no-base-to-string
		return typeof argument === 'string' ? argument : String(argument);
	}).join('|');
}

/**
 * Creates a unique cache key for a function call based on the function and its arguments.
 * Uses a WeakMap to maintain stable object references for complex arguments.
 *
 * @param function_ - The memoized function
 * @param arguments_ - The arguments passed to the function
 * @returns A unique cache key for this function call
 *
 * @example
 * ```typescript
 * const fn = (a: number, b: string) => a + b;
 * const key = createKey(fn, [1, 'hello']);
 * // Returns a unique object reference for this specific function call
 * ```
 */
function createKey(function_: MemoizableFunction, arguments_: unknown[]): SerializedCacheKey {
	let argumentsKeyMap = functionArgumentsKeyMap.get(function_);
	if (!argumentsKeyMap) {
		argumentsKeyMap = new Map();
		functionArgumentsKeyMap.set(function_, argumentsKeyMap);
	}

	const argumentsKey = getArgumentsKey(arguments_);
	let cacheKey = argumentsKeyMap.get(argumentsKey);

	if (!cacheKey) {
		// Use a unique object as the cache key
		cacheKey = {};
		argumentsKeyMap.set(argumentsKey, cacheKey);
	}

	return cacheKey as SerializedCacheKey;
}

/**
 * Caches a synchronous function result in the LRU cache.
 * Handles undefined values by converting them to a special symbol.
 *
 * @param key - The cache key for this result
 * @param result - The synchronous result to cache
 * @returns The original result (unchanged)
 *
 * @example
 * ```typescript
 * const key = createKey(fn, [1, 2]);
 * const result = cacheSyncResult(key, 42);
 * // result is 42, and the value is cached
 * ```
 */
function cacheSyncResult<T>(key: SerializedCacheKey, result: T): T {
	const valueToCache = marshallUndefined(result);
	cache.set(key, valueToCache);
	return result;
}

/**
 * Caches a Promise result in the LRU cache.
 * Handles both successful resolutions and rejections properly.
 * If the promise rejects, the cache entry is deleted to allow retry.
 *
 * @param key - The cache key for this result
 * @param promise - The Promise to cache
 * @returns A new Promise that resolves/rejects with the same value/error
 *
 * @example
 * ```typescript
 * const key = createKey(fn, [1, 2]);
 * const promise = cachePromiseResult(key, Promise.resolve(42));
 * // promise resolves to 42, and the resolved value is cached
 * ```
 */
async function cachePromiseResult<T>(key: SerializedCacheKey, promise: Promise<T>): Promise<T> {
	const cachedPromise = (async () => {
		try {
			const resolvedValue = await promise;
			const valueToCache = marshallUndefined(resolvedValue);
			cache.set(key, valueToCache);
			return resolvedValue;
		} catch (error) {
			cache.delete(key);
			throw error;
		}
	})();

	cache.set(key, cachedPromise);

	return cachedPromise;
}

/**
 * Caches a Generator result in the LRU cache.
 * Generators are cached as-is since they are consumed during iteration.
 *
 * @param key - The cache key for this result
 * @param generator - The Generator to cache
 * @returns The original generator (unchanged)
 *
 * @example
 * ```typescript
 * function* gen() { yield 1; yield 2; }
 * const key = createKey(fn, []);
 * const result = cacheGeneratorResult(key, gen());
 * // result is the generator, and it's cached
 * ```
 */
function cacheGeneratorResult<T>(
	key: SerializedCacheKey,
	generator: Generator<T, T, T>,
): Generator<T, T, T> {
	cache.set(key, generator);
	return generator;
}

/**
 * Caches an AsyncGenerator result in the LRU cache.
 * AsyncGenerators are cached as-is since they are consumed during iteration.
 *
 * @param key - The cache key for this result
 * @param asyncGenerator - The AsyncGenerator to cache
 * @returns The original async generator (unchanged)
 *
 * @example
 * ```typescript
 * async function* asyncGen() { yield 1; yield 2; }
 * const key = createKey(fn, []);
 * const result = cacheAsyncGeneratorResult(key, asyncGen());
 * // result is the async generator, and it's cached
 * ```
 */
function cacheAsyncGeneratorResult<T>(
	key: SerializedCacheKey,
	asyncGenerator: AsyncGenerator<T, T, T>,
): AsyncGenerator<T, T, T> {
	cache.set(key, asyncGenerator);
	return asyncGenerator;
}

/**
 * Configures the global cache with new options.
 * Creates a new LRU cache instance and migrates existing entries if any.
 *
 * @param options - Cache configuration options
 *
 * @example
 * ```typescript
 * // Set cache to hold maximum 1000 entries with 1 minute TTL
 * setup({ max: 1000, ttl: 60000 });
 *
 * // Use default options
 * setup();
 * ```
 */
export function setup(options: CacheConfig = defaultOptions): void {
	const newCache = new LRUCache<SerializedCacheKey, any>({
		...defaultOptions,
		...options,
	});

	// Migrate existing entries if cache is not empty
	if (cache.size > 0) {
		for (const [key, value] of cache.entries()) {
			newCache.set(key, value);
		}
	}

	cache = newCache;
}

/**
 * Clears all entries from the global cache.
 * This is useful for freeing memory or resetting the cache state.
 *
 * @example
 * ```typescript
 * // Clear all cached results
 * clearCache();
 *
 * // Check cache is empty
 * const stats = getCacheStats();
 * console.log(stats.size); // 0
 * ```
 */
export function clearCache(): void {
	cache.clear();
}

/**
 * Returns statistics about the current cache state.
 * Useful for monitoring cache performance and memory usage.
 *
 * @returns Object containing cache size and maximum capacity
 *
 * @example
 * ```typescript
 * const stats = getCacheStats();
 * console.log(`Cache usage: ${stats.size}/${stats.max}`);
 *
 * // Check if cache is getting full
 * if (stats.size > stats.max * 0.8) {
 *   console.log('Cache is getting full!');
 * }
 * ```
 */
export function getCacheStats(): CacheStats {
	return {
		size: cache.size,
		max: cache.max,
	};
}

/**
 * Creates a memoized version of the given function.
 * The memoized function will cache results based on the function and its arguments,
 * returning cached results for identical calls without re-executing the original function.
 *
 * Supports all function types:
 * - Synchronous functions
 * - Async functions (returning Promises)
 * - Generator functions
 * - Async generator functions
 *
 * The memoized function preserves the original function's metadata (name, length, etc.)
 * using the mimic-function library.
 *
 * @param function_ - The function to memoize
 * @returns A memoized version of the original function with the same signature
 *
 * @example
 * ```typescript
 * // Basic synchronous function
 * const expensiveCalculation = memoize((a: number, b: number) => {
 *   // Expensive computation here
 *   return a + b;
 * });
 *
 * // Async function
 * const fetchUser = memoize(async (id: number) => {
 *   const response = await fetch(`/api/users/${id}`);
 *   return response.json();
 * });
 *
 * // Generator function
 * const fibonacci = memoize(function* (n: number) {
 *   let a = 0, b = 1;
 *   for (let i = 0; i < n; i++) {
 *     yield a;
 *     [a, b] = [b, a + b];
 *   }
 * });
 *
 * // Complex parameters
 * const processUser = memoize((user: { id: number; name: string }) => {
 *   return `${user.name} (${user.id})`;
 * });
 *
 * // Functions with symbols
 * const symbolKey = Symbol('key');
 * const getValue = memoize((key: symbol) => {
 *   return `value for ${key.toString()}`;
 * });
 * ```
 */
export function memoize<T extends MemoizableFunction>(function_: T): T {
	const memoizedFunction = ((...arguments_: unknown[]) => {
		const key = createKey(function_, arguments_);

		// Check if result is already cached
		if (cache.has(key)) {
			return unmarshallUndefined(cache.get(key));
		}

		// Execute function and cache result based on type
		const result = function_(...arguments_);

		if (isPromise(result)) {
			return cachePromiseResult(key, result);
		}

		if (isGenerator(result)) {
			return cacheGeneratorResult(key, result);
		}

		if (isAsyncGenerator(result)) {
			return cacheAsyncGeneratorResult(key, result);
		}

		return cacheSyncResult(key, result);
	}) as T;

	return mimicFunction(memoizedFunction, function_);
}
