/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */

/**
 * @fileoverview Comprehensive test suite for the Kioku memoization library
 *
 * This test file validates all aspects of the memoization functionality:
 * - Basic memoization behavior
 * - Function metadata preservation
 * - Complex parameter handling (objects, symbols, undefined)
 * - Promise support and error handling
 * - Generator and AsyncGenerator support
 * - Cache management (setup, clear, statistics)
 * - Edge cases and type safety
 *
 * The tests use AVA as the testing framework and cover both runtime behavior
 * and TypeScript type checking to ensure the library works correctly in all scenarios.
 *
 * @example
 * ```bash
 * # Run all tests
 * npm test
 *
 * # Run tests with verbose output
 * npm test -- --verbose
 *
 * # Run specific test
 * npm test -- --match="basic memoization"
 * ```
 */

import test from 'ava';
import {
	memoize, setup, clearCache, getCacheStats,
} from './index.js';

/**
 * Test: Function metadata preservation
 *
 * Validates that the memoized function preserves important metadata from the original function,
 * including name, displayName, custom properties, and length. This ensures that the
 * memoized function behaves identically to the original function in terms of introspection.
 *
 * Note: The mimic-function library is used to preserve function metadata, though it
 * doesn't preserve the length property as that would break the memoization functionality.
 */
function expensiveCalculation(a: number, b: number): number {
	return a + b;
}

expensiveCalculation.displayName = 'expensiveCalculation';
(expensiveCalculation as any).customProperty = 'test';
const memoizedCalculation = memoize(expensiveCalculation as any);

test('metadata is preserved', t => {
	t.is(expensiveCalculation.name, memoizedCalculation.name);
	t.is((expensiveCalculation as any).displayName, (memoizedCalculation).displayName);
	t.is((expensiveCalculation as any).customProperty, (memoizedCalculation).customProperty);
	t.is(expensiveCalculation.length, 2);
	t.is(memoizedCalculation.length, 0); // Mimic-function does not preserve length
});

/**
 * Test: Basic memoization functionality
 *
 * Validates the core memoization behavior - that identical function calls
 * return cached results instead of re-executing the original function.
 * This is the fundamental feature that all memoization libraries must provide.
 */
test('basic memoization', t => {
	let index = 0;
	const function_ = () => index++;

	const memoized = memoize(function_);
	t.is(memoized(), 0);
	t.is(memoized(), 0);
	t.is(memoized(), 0);
	t.is(index, 1);
});

/**
 * Test: Memoization with function arguments
 *
 * Validates that memoization works correctly when functions have parameters.
 * Different argument combinations should produce different cached results,
 * while identical arguments should return cached results.
 */
test('memoization with arguments', t => {
	let index = 0;
	const function_ = (x: unknown) => index++;
	const memoized = memoize(function_);
	t.is(memoized('a'), 0);
	t.is(memoized('a'), 0);
	t.is(memoized('b'), 1);
	t.is(memoized('b'), 1);
	t.is(index, 2);
});

/**
 * Test: Memoization with complex object parameters
 *
 * Validates that memoization works correctly with complex parameter types
 * like objects and arrays. This tests the argument serialization logic
 * that converts complex types into cache keys.
 */
test('memoization with complex objects', t => {
	let index = 0;
	const function_ = (a?: unknown, b?: unknown, c?: unknown) => index++;
	const memoized = memoize(function_);
	t.is(memoized(), 0);
	t.is(memoized(), 0);
	t.is(memoized({foo: true}, {bar: false}), 1);
	t.is(memoized({foo: true}, {bar: false}), 1);
	t.is(memoized({foo: true}, {bar: false}, {baz: true}), 2);
	t.is(memoized({foo: true}, {bar: false}, {baz: true}), 2);
});

/**
 * Test: Memoization with Symbol parameters
 *
 * Validates that memoization works correctly with Symbol parameters.
 * Symbols are special JavaScript primitives that need special handling
 * in the argument serialization process.
 */
test('memoization with symbols', t => {
	let index = 0;
	const argument1 = Symbol('fixture1');
	const argument2 = Symbol('fixture2');
	const memoized = memoize((a?: unknown) => index++);
	t.is(memoized(), 0);
	t.is(memoized(), 0);
	t.is(memoized(argument1), 1);
	t.is(memoized(argument1), 1);
	t.is(memoized(argument2), 2);
	t.is(memoized(argument2), 2);
});

/**
 * Test: Memoization with undefined return values
 *
 * Validates that memoization works correctly when functions return undefined.
 * This tests the special handling of undefined values in the cache,
 * which uses a special symbol to distinguish undefined from missing cache entries.
 */
test('memoization with undefined', t => {
	let index = 0;
	const memoized = memoize(() => {
		index++;
		return undefined;
	});
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	t.is(memoized(), undefined);
	// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
	t.is(memoized(), undefined);
	t.is(index, 1);
});

/**
 * Test: Promise support in memoization
 *
 * Validates that memoization works correctly with async functions that return Promises.
 * This tests the Promise caching logic that handles both pending promises and
 * resolved/rejected values appropriately.
 */
test('promise support', async t => {
	let index = 0;
	const memoized = memoize(async (a?: unknown) => index++);
	t.is(await memoized(), 0);
	t.is(await memoized(), 0);
	t.is(await memoized(10), 1);
	t.is(await memoized(10), 1);
});

/**
 * Test: Error handling in Promise memoization
 *
 * Validates that memoization correctly handles Promise rejections.
 * When a Promise rejects, the cache entry should be deleted to allow
 * retry attempts, while successful promises should be cached normally.
 */
test('error handling in promises', async t => {
	let index = 0;
	const memoized = memoize(async (shouldThrow: unknown) => {
		index++;
		if (shouldThrow) {
			throw new Error('Test error');
		}

		return index;
	});
	t.is(await memoized(false), 1);
	t.is(await memoized(false), 1);
	await t.throwsAsync(async () => memoized(true), {message: 'Test error'});
	await t.throwsAsync(async () => memoized(true), {message: 'Test error'});
});

/**
 * Test: Generator function memoization
 *
 * Validates that memoization works correctly with generator functions.
 * Generator functions should be cached and return the same generator instance
 * for identical calls.
 */
test('generator function memoization', t => {
	let index = 0;
	function * generatorFunction(n: number) {
		for (let i = 0; i < n; i++) {
			index++;
			yield i;
		}

		return n;
	}

	const memoized = memoize(generatorFunction);
	const generator1 = memoized(3);
	const generator2 = memoized(3);

	// Both should be the same generator instance
	t.is(generator1, generator2);

	// Consume the generator
	const results1 = [...generator1];
	t.deepEqual(results1, [0, 1, 2]);
	t.is(index, 3); // Should only execute once due to memoization
});

/**
 * Test: Async generator function memoization
 *
 * Validates that memoization works correctly with async generator functions.
 * Async generator functions should be cached and return the same async generator instance
 * for identical calls.
 */
test('async generator function memoization', async t => {
	let index = 0;
	async function * asyncGeneratorFunction(n: number) {
		for (let i = 0; i < n; i++) {
			index++;
			yield i;
		}

		return n;
	}

	const memoized = memoize(asyncGeneratorFunction);
	const generator1 = memoized(3);
	const generator2 = memoized(3);

	// Both should be the same async generator instance
	t.is(generator1, generator2);

	// Consume the async generator
	const results1: unknown[] = [];
	for await (const value of generator1) {
		results1.push(value);
	}

	t.deepEqual(results1, [0, 1, 2]);
	t.is(index, 3); // Should only execute once due to memoization
});

/**
 * Test: Generator with different parameters
 *
 * Validates that generators with different parameters are cached separately.
 */
test('generator with different parameters', t => {
	let index = 0;
	function * generatorFunction(n: number) {
		for (let i = 0; i < n; i++) {
			index++;
			yield i;
		}
	}

	const memoized = memoize(generatorFunction);

	// Different parameters should create different cache entries
	const generator1 = memoized(2);
	const generator2 = memoized(3);

	t.not(generator1, generator2);

	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	[...generator1];
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	[...generator2];

	t.is(index, 5); // 2 + 3 = 5
});

/**
 * Test: Async generator with different parameters
 *
 * Validates that async generators with different parameters are cached separately.
 */
test('async generator with different parameters', async t => {
	let index = 0;
	async function * asyncGeneratorFunction(n: number) {
		for (let i = 0; i < n; i++) {
			index++;
			yield i;
		}
	}

	const memoized = memoize(asyncGeneratorFunction);

	// Different parameters should create different cache entries
	const generator1 = memoized(2);
	const generator2 = memoized(3);

	t.not(generator1, generator2);

	// eslint-disable-next-line no-empty
	for await (const _ of generator1) {}

	// eslint-disable-next-line no-empty
	for await (const _ of generator2) {}

	t.is(index, 5); // 2 + 3 = 5
});

/**
 * Test: Complex argument serialization edge cases
 *
 * Validates that the argument serialization handles various edge cases correctly.
 * This tests the getArgumentsKey function with different argument types.
 */
test('complex argument serialization edge cases', t => {
	let index = 0;
	const function_ = (...arguments_: unknown[]) => index++;
	const memoized = memoize(function_);

	// Test null values
	t.is(memoized(null), 0);
	t.is(memoized(null), 0);

	// Test functions
	const testFunction = () => 'test';
	t.is(memoized(testFunction), 1);
	t.is(memoized(testFunction), 1);

	// Test anonymous functions
	t.is(memoized(() => 'anonymous'), 2);
	t.is(memoized(() => 'anonymous'), 2);

	// Test objects with toStringTag
	const objectWithTag = {
		[Symbol.toStringTag]: 'CustomObject',
		toString() {
			return 'custom';
		},
	};
	t.is(memoized(objectWithTag), 3);
	t.is(memoized(objectWithTag), 3);

	// Test symbols with descriptions
	const symbolWithDesc = Symbol('description');
	t.is(memoized(symbolWithDesc), 4);
	t.is(memoized(symbolWithDesc), 4);

	// Test symbols without descriptions
	// eslint-disable-next-line symbol-description
	const symbolNoDesc = Symbol();
	t.is(memoized(symbolNoDesc), 5);
	t.is(memoized(symbolNoDesc), 5);

	t.is(index, 6);
});

/**
 * Test: Cache migration when setup is called
 *
 * Validates that when setup() is called with a non-empty cache,
 * existing entries are migrated to the new cache instance.
 */
test('cache migration when setup is called', t => {
	// Clear cache first
	clearCache();

	// Add some entries to the cache
	let index = 0;
	const memoized = memoize(() => index++);
	memoized();

	// @ts-expect-error - we want to test the wrong usage of the function
	memoized('test');

	// Verify cache has entries
	const statsBefore = getCacheStats();
	t.true(statsBefore.size > 0);

	// Setup new cache with different options
	setup({max: 50, ttl: 2000});

	// Verify cache still has entries (migrated)
	const statsAfter = getCacheStats();
	t.is(statsAfter.size, statsBefore.size);
	t.is(statsAfter.max, 50);

	// Verify cached results still work
	t.is(memoized(), 0); // Should return cached result

	// @ts-expect-error - we want to test the wrong usage of the function
	t.is(memoized('test'), 1); // Should return cached result

	t.is(index, 2); // Should not increment further
});

/**
 * Test: Promise caching with multiple concurrent calls
 *
 * Validates that multiple concurrent calls to the same memoized async function
 * return the same promise instance, preventing duplicate work.
 */
test('promise caching with multiple concurrent calls', async t => {
	let executionCount = 0;
	const memoized = memoize(async (id: number) => {
		executionCount++;
		// eslint-disable-next-line no-promise-executor-return
		await new Promise(resolve => setTimeout(resolve, 10));

		return `result-${id}`;
	});

	// Make multiple concurrent calls
	const promise1 = memoized(1);
	const promise2 = memoized(1);
	const promise3 = memoized(1);

	// Wait for all to resolve
	const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

	t.is(result1, 'result-1');
	t.is(result2, 'result-1');
	t.is(result3, 'result-1');
	t.is(executionCount, 1); // Should only execute once
});

/**
 * Test: Promise rejection cache deletion
 *
 * Validates that when a promise rejects, the cache entry is deleted
 * to allow retry attempts.
 */
test('promise rejection cache deletion', async t => {
	let callCount = 0;
	const memoized = memoize(async (shouldFail: boolean) => {
		callCount++;
		if (shouldFail) {
			throw new Error('Intentional failure');
		}

		return 'success';
	});

	// First call should succeed
	t.is(await memoized(false), 'success');
	t.is(callCount, 1);

	// Second call should use cache
	t.is(await memoized(false), 'success');
	t.is(callCount, 1);

	// Third call should fail and not be cached
	await t.throwsAsync(async () => memoized(true), {message: 'Intentional failure'});
	t.is(callCount, 2);

	// Fourth call should fail again (not cached)
	await t.throwsAsync(async () => memoized(true), {message: 'Intentional failure'});
	t.is(callCount, 3);
});

/**
 * Test: Generator with early return
 *
 * Validates that generators that return early are handled correctly.
 */
test('generator with early return', t => {
	let index = 0;
	function * generatorFunction(shouldReturn: boolean) {
		index++;
		if (shouldReturn) {
			return 'early return';
		}

		yield 1;
		yield 2;
		return 'normal return';
	}

	const memoized = memoize(generatorFunction);

	// Test early return
	const generator1 = memoized(true);
	const result1 = generator1.next();
	t.is(result1.value, 'early return');
	t.is(result1.done, true);

	// Test normal execution
	const generator2 = memoized(false);
	const result2 = generator2.next();
	t.is(result2.value, 1);
	t.is(result2.done, false);

	t.is(index, 2); // Should execute twice for different parameters
});

/**
 * Test: Async generator with early return
 *
 * Validates that async generators that return early are handled correctly.
 */
test('async generator with early return', async t => {
	let index = 0;
	async function * asyncGeneratorFunction(shouldReturn: boolean) {
		index++;
		if (shouldReturn) {
			return 'early return';
		}

		yield 1;
		yield 2;
		return 'normal return';
	}

	const memoized = memoize(asyncGeneratorFunction);

	// Test early return
	const asyncGenerator1 = memoized(true);
	const result1 = await asyncGenerator1.next();
	t.is(result1.value, 'early return');
	t.is(result1.done, true);

	// Test normal execution
	const asyncGenerator2 = memoized(false);
	const result2 = await asyncGenerator2.next();
	t.is(result2.value, 1);
	t.is(result2.done, false);

	t.is(index, 2); // Should execute twice for different parameters
});

/**
 * Test: Function with null parameters
 *
 * Validates that null parameters are handled correctly in argument serialization.
 */
test('function with null parameters', t => {
	let index = 0;
	const memoized = memoize((parameter: unknown) => index++);

	t.is(memoized(null), 0);
	t.is(memoized(null), 0);
	t.is(memoized(undefined), 1);
	t.is(memoized(undefined), 1);

	t.is(index, 2);
});

/**
 * Test: Function with primitive types
 *
 * Validates that all primitive types are handled correctly in argument serialization.
 */
test('function with primitive types', t => {
	let index = 0;
	const memoized = memoize((parameter: unknown) => index++);

	// Test all primitive types
	t.is(memoized('string'), 0);
	t.is(memoized('string'), 0);
	t.is(memoized(42), 1);
	t.is(memoized(42), 1);
	t.is(memoized(true), 2);
	t.is(memoized(true), 2);
	t.is(memoized(false), 3);
	t.is(memoized(false), 3);
	t.is(memoized(3.14), 4);
	t.is(memoized(3.14), 4);

	t.is(index, 5);
});

/**
 * Test: Cache statistics and clearing functionality
 *
 * Validates the cache management functions:
 * - getCacheStats() returns accurate cache statistics
 * - clearCache() properly clears all cached entries
 *
 * This ensures that users can monitor and control the cache behavior.
 */
test('cache statistics and clearing', t => {
	let index = 0;
	const memoized = memoize(() => index++);
	memoized();
	memoized();
	t.true(getCacheStats().size > 0);
	clearCache();
	t.is(getCacheStats().size, 0);
});

/**
 * Test: Cache configuration with custom options
 *
 * Validates that the setup() function correctly configures the cache
 * with custom options like maximum size and TTL (time-to-live).
 * This ensures that users can tune the cache behavior for their specific needs.
 */
test('cache setup with custom options', t => {
	setup({max: 10, ttl: 1000});
	t.is(getCacheStats().max, 10);
});

/**
 * Test: Setup with no parameters
 *
 * Validates that setup() works correctly when called without parameters,
 * using the default configuration.
 */
test('setup with no parameters', t => {
	setup();
	const stats = getCacheStats();
	t.is(stats.max, 100); // Default max value
	t.true(stats.size >= 0); // Size should be non-negative
});

/**
 * Test: Multiple setup calls
 *
 * Validates that multiple calls to setup() work correctly and don't cause issues.
 */
test('multiple setup calls', t => {
	// First setup
	setup({max: 50, ttl: 1000});
	t.is(getCacheStats().max, 50);

	// Second setup
	setup({max: 200, ttl: 5000});
	t.is(getCacheStats().max, 200);

	// Third setup with defaults
	setup();
	t.is(getCacheStats().max, 100);
});

/**
 * Test: Cache stats with empty cache
 *
 * Validates that getCacheStats() returns correct values when the cache is empty.
 */
test('cache stats with empty cache', t => {
	clearCache();
	const stats = getCacheStats();
	t.is(stats.size, 0);
	t.true(stats.max > 0);
});

/**
 * Test: Memoization with void return type
 *
 * Validates that functions returning void are handled correctly.
 */
test('memoization with void return type', t => {
	let index = 0;
	const voidFunction = (): void => {
		index++;
	};

	const memoized = memoize(voidFunction);

	memoized();
	memoized();

	t.is(index, 1); // Should only execute once
});

/**
 * Test: Memoization with never return type
 *
 * Validates that functions returning never (throwing functions) are handled correctly.
 */
test('memoization with never return type', t => {
	let index = 0;
	const neverFunction = (): never => {
		index++;
		throw new Error('This function never returns');
	};

	const memoized = memoize(neverFunction);

	// First call should throw
	t.throws(() => memoized());
	t.is(index, 1);

	// Second call should throw again (not cached)
	t.throws(() => memoized());
	t.is(index, 2);
});
