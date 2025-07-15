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
 * The tests use Node.js built-in test module and cover both runtime behavior
 * and TypeScript type checking to ensure the library works correctly in all scenarios.
 *
 * @example
 * ```bash
 * # Run all tests
 * npm test
 *
 * # Run tests with verbose output
 * node --test --test-reporter=verbose src/test.ts
 *
 * # Run specific test
 * node --test --test-name-pattern="basic memoization" src/test.ts
 * ```
 */

import {
    deepStrictEqual, notStrictEqual, ok, rejects, strictEqual, throws,
} from 'node:assert';
import test, { describe } from 'node:test';
import {
    clearCache, getCacheStats, memoize, setup,
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
type ExpensiveCalculation = {
    (a: number, b: number): number;
    displayName: string;
    customProperty: string;
};

const expensiveCalculation: ExpensiveCalculation = Object.assign(
    (a: number, b: number) => a + b,
    {
        displayName: 'expensiveCalculation',
        customProperty: 'test',
    },
);

const memoizedCalculation = memoize(expensiveCalculation);

void describe('memoize', () => {
    void test('metadata is preserved', () => {
        strictEqual(expensiveCalculation.name, memoizedCalculation.name);
        strictEqual((expensiveCalculation).displayName, memoizedCalculation.displayName);
        strictEqual((expensiveCalculation).customProperty, memoizedCalculation.customProperty);
        strictEqual(expensiveCalculation.length, 2);
        strictEqual(memoizedCalculation.length, 0); // Mimic-function does not preserve length
    });

    /**
     * Test: Basic memoization functionality
     *
     * Validates the core memoization behavior - that identical function calls
     * return cached results instead of re-executing the original function.
     * This is the fundamental feature that all memoization libraries must provide.
     */
    void test('basic memoization', async _ => {
        let index = 0;
        const function_ = () => index++;

        const memoized = memoize(function_);
        strictEqual(memoized(), 0);
        strictEqual(memoized(), 0);
        strictEqual(memoized(), 0);
        strictEqual(index, 1);
    });

    /**
     * Test: Memoization with function arguments
     *
     * Validates that memoization works correctly when functions have parameters.
     * Different argument combinations should produce different cached results,
     * while identical arguments should return cached results.
     */
    void test('memoization with arguments', async _ => {
        let index = 0;
        const function_ = (_: unknown) => index++;
        const memoized = memoize(function_);
        strictEqual(memoized('a'), 0);
        strictEqual(memoized('a'), 0);
        strictEqual(memoized('b'), 1);
        strictEqual(memoized('b'), 1);
        strictEqual(index, 2);
    });

    /**
     * Test: Memoization with complex object parameters
     *
     * Validates that memoization works correctly with complex parameter types
     * like objects and arrays. This tests the argument serialization logic
     * that converts complex types into cache keys.
     */
    void test('memoization with complex objects', async _ => {
        let index = 0;
        const function_ = (_a?: unknown, _b?: unknown, _c?: unknown) => index++;
        const memoized = memoize(function_);
        strictEqual(memoized(), 0);
        strictEqual(memoized(), 0);
        strictEqual(memoized({ foo: true }, { bar: false }), 1);
        strictEqual(memoized({ foo: true }, { bar: false }), 1);
        strictEqual(memoized({ foo: true }, { bar: false }, { baz: true }), 2);
        strictEqual(memoized({ foo: true }, { bar: false }, { baz: true }), 2);
    });

    /**
     * Test: Memoization with Symbol parameters
     *
     * Validates that memoization works correctly with Symbol parameters.
     * Symbols are special JavaScript primitives that need special handling
     * in the argument serialization process.
     */
    void test('memoization with symbols', async _ => {
        let index = 0;
        const argument1 = Symbol('fixture1');
        const argument2 = Symbol('fixture2');
        const memoized = memoize((_?: unknown) => index++);
        strictEqual(memoized(), 0);
        strictEqual(memoized(), 0);
        strictEqual(memoized(argument1), 1);
        strictEqual(memoized(argument1), 1);
        strictEqual(memoized(argument2), 2);
        strictEqual(memoized(argument2), 2);
    });

    /**
     * Test: Memoization with undefined return values
     *
     * Validates that memoization works correctly when functions return undefined.
     * This tests the special handling of undefined values in the cache,
     * which uses a special symbol to distinguish undefined from missing cache entries.
     */
    void test('memoization with undefined', async _ => {
        let index = 0;
        const memoized = memoize(() => {
            index++;
            return undefined;
        });
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        strictEqual(memoized(), undefined);
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        strictEqual(memoized(), undefined);
        strictEqual(index, 1);
    });

    /**
     * Test: Promise support in memoization
     *
     * Validates that memoization works correctly with async functions that return Promises.
     * This tests the Promise caching logic that handles both pending promises and
     * resolved/rejected values appropriately.
     */
    void test('promise support', async _ => {
        let index = 0;
        const memoized = memoize(async (_?: unknown) => index++);
        strictEqual(await memoized(), 0);
        strictEqual(await memoized(), 0);
        strictEqual(await memoized(10), 1);
        strictEqual(await memoized(10), 1);
    });

    /**
     * Test: Error handling in Promise memoization
     *
     * Validates that memoization correctly handles Promise rejections.
     * When a Promise rejects, the cache entry should be deleted to allow
     * retry attempts, while successful promises should be cached normally.
     */
    void test('error handling in promises', async _ => {
        let index = 0;
        const memoized = memoize(async (shouldThrow: unknown) => {
            index++;
            if (shouldThrow) {
                throw new Error('Test error');
            }

            return index;
        });
        strictEqual(await memoized(false), 1);
        strictEqual(await memoized(false), 1);
        await rejects(async () => memoized(true), { message: 'Test error' });
        await rejects(async () => memoized(true), { message: 'Test error' });
    });

    /**
     * Test: Generator function memoization
     *
     * Validates that memoization works correctly with generator functions.
     * Generator functions should be cached and return the same generator instance
     * for identical calls.
     */
    void test('generator function memoization', async _ => {
        let index = 0;
        function* generatorFunction(n: number) {
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
        strictEqual(generator1, generator2);

        // Consume the generator
        const results1 = [...generator1];
        deepStrictEqual(results1, [0, 1, 2]);
        strictEqual(index, 3); // Should only execute once due to memoization
    });

    /**
     * Test: Async generator function memoization
     *
     * Validates that memoization works correctly with async generator functions.
     * Async generator functions should be cached and return the same async generator instance
     * for identical calls.
     */
    void test('async generator function memoization', async _ => {
        let index = 0;
        async function* asyncGeneratorFunction(n: number) {
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
        strictEqual(generator1, generator2);

        // Consume the async generator
        const results1: unknown[] = [];
        for await (const value of generator1) {
            results1.push(value);
        }

        deepStrictEqual(results1, [0, 1, 2]);
        strictEqual(index, 3); // Should only execute once due to memoization
    });

    /**
     * Test: Generator with different parameters
     *
     * Validates that generators with different parameters are cached separately.
     */
    void test('generator with different parameters', async _ => {
        let index = 0;
        function* generatorFunction(n: number) {
            for (let i = 0; i < n; i++) {
                index++;
                yield i;
            }
        }

        const memoized = memoize(generatorFunction);

        // Different parameters should create different cache entries
        const generator1 = memoized(2);
        const generator2 = memoized(3);

        notStrictEqual(generator1, generator2);

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        [...generator1];
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        [...generator2];

        strictEqual(index, 5); // 2 + 3 = 5
    });

    /**
     * Test: Async generator with different parameters
     *
     * Validates that async generators with different parameters are cached separately.
     */
    void test('async generator with different parameters', async _ => {
        let index = 0;
        async function* asyncGeneratorFunction(n: number) {
            for (let i = 0; i < n; i++) {
                index++;
                yield i;
            }
        }

        const memoized = memoize(asyncGeneratorFunction);

        // Different parameters should create different cache entries
        const generator1 = memoized(2);
        const generator2 = memoized(3);

        notStrictEqual(generator1, generator2);

        // eslint-disable-next-line no-empty
        for await (const _ of generator1) { }

        // eslint-disable-next-line no-empty
        for await (const _ of generator2) { }

        strictEqual(index, 5); // 2 + 3 = 5
    });

    /**
     * Test: Complex argument serialization edge cases
     *
     * Validates that the argument serialization handles various edge cases correctly.
     * This tests the getArgumentsKey function with different argument types.
     */
    void test('complex argument serialization edge cases', async _ => {
        let index = 0;
        const function_ = (..._arguments: unknown[]) => index++;
        const memoized = memoize(function_);

        // Test null values
        strictEqual(memoized(null), 0);
        strictEqual(memoized(null), 0);

        // Test functions
        const testFunction = () => 'test';
        strictEqual(memoized(testFunction), 1);
        strictEqual(memoized(testFunction), 1);

        // Test anonymous functions
        strictEqual(memoized(() => 'anonymous'), 2);
        strictEqual(memoized(() => 'anonymous'), 2);

        // Test objects with toStringTag
        const objectWithTag = {
            [Symbol.toStringTag]: 'CustomObject',
            toString() {
                return 'custom';
            },
        };
        strictEqual(memoized(objectWithTag), 3);
        strictEqual(memoized(objectWithTag), 3);

        // Test symbols with descriptions
        const symbolWithDesc = Symbol('description');
        strictEqual(memoized(symbolWithDesc), 4);
        strictEqual(memoized(symbolWithDesc), 4);

        // Test symbols without descriptions
        // eslint-disable-next-line symbol-description
        const symbolNoDesc = Symbol();
        strictEqual(memoized(symbolNoDesc), 5);
        strictEqual(memoized(symbolNoDesc), 5);

        strictEqual(index, 6);
    });

    /**
     * Test: Promise caching with multiple concurrent calls
     *
     * Validates that multiple concurrent calls to the same memoized async function
     * return the same promise instance, preventing duplicate work.
     */
    void test('promise caching with multiple concurrent calls', async _ => {
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

        strictEqual(result1, 'result-1');
        strictEqual(result2, 'result-1');
        strictEqual(result3, 'result-1');
        strictEqual(executionCount, 1); // Should only execute once
    });

    /**
     * Test: Promise rejection cache deletion
     *
     * Validates that when a promise rejects, the cache entry is deleted
     * to allow retry attempts.
     */
    void test('promise rejection cache deletion', async _ => {
        let callCount = 0;
        const memoized = memoize(async (shouldFail: boolean) => {
            callCount++;
            if (shouldFail) {
                throw new Error('Intentional failure');
            }

            return 'success';
        });

        // First call should succeed
        strictEqual(await memoized(false), 'success');
        strictEqual(callCount, 1);

        // Second call should use cache
        strictEqual(await memoized(false), 'success');
        strictEqual(callCount, 1);

        // Third call should fail and not be cached
        await rejects(async () => memoized(true), { message: 'Intentional failure' });
        strictEqual(callCount, 2);

        // Fourth call should fail again (not cached)
        await rejects(async () => memoized(true), { message: 'Intentional failure' });
        strictEqual(callCount, 3);
    });

    /**
     * Test: Generator with early return
     *
     * Validates that generators that return early are handled correctly.
     */
    void test('generator with early return', async _ => {
        let index = 0;
        function* generatorFunction(shouldReturn: boolean) {
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
        strictEqual(result1.value, 'early return');
        strictEqual(result1.done, true);

        // Test normal execution
        const generator2 = memoized(false);
        const result2 = generator2.next();
        strictEqual(result2.value, 1);
        strictEqual(result2.done, false);

        strictEqual(index, 2); // Should execute twice for different parameters
    });

    /**
     * Test: Async generator with early return
     *
     * Validates that async generators that return early are handled correctly.
     */
    void test('async generator with early return', async _ => {
        let index = 0;
        async function* asyncGeneratorFunction(shouldReturn: boolean) {
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
        strictEqual(result1.value, 'early return');
        strictEqual(result1.done, true);

        // Test normal execution
        const asyncGenerator2 = memoized(false);
        const result2 = await asyncGenerator2.next();
        strictEqual(result2.value, 1);
        strictEqual(result2.done, false);

        strictEqual(index, 2); // Should execute twice for different parameters
    });

    /**
     * Test: Function with null parameters
     *
     * Validates that null parameters are handled correctly in argument serialization.
     */
    void test('function with null parameters', async _ => {
        let index = 0;
        const memoized = memoize((_parameter: unknown) => index++);

        strictEqual(memoized(null), 0);
        strictEqual(memoized(null), 0);
        strictEqual(memoized(undefined), 1);
        strictEqual(memoized(undefined), 1);

        strictEqual(index, 2);
    });

    /**
     * Test: Function with primitive types
     *
     * Validates that all primitive types are handled correctly in argument serialization.
     */
    void test('function with primitive types', async _ => {
        let index = 0;
        const memoized = memoize((_parameter: unknown) => index++);

        // Test all primitive types
        strictEqual(memoized('string'), 0);
        strictEqual(memoized('string'), 0);
        strictEqual(memoized(42), 1);
        strictEqual(memoized(42), 1);
        strictEqual(memoized(true), 2);
        strictEqual(memoized(true), 2);
        strictEqual(memoized(false), 3);
        strictEqual(memoized(false), 3);
        strictEqual(memoized(3.14), 4);
        strictEqual(memoized(3.14), 4);

        strictEqual(index, 5);
    });

    /**
     * Test: Memoization with void return type
     *
     * Validates that functions returning void are handled correctly.
     */
    void test('memoization with void return type', async _ => {
        let index = 0;
        const voidFunction = (): void => {
            index++;
        };

        const memoized = memoize(voidFunction);

        memoized();
        memoized();

        strictEqual(index, 1); // Should only execute once
    });

    /**
     * Test: Memoization with never return type
     *
     * Validates that functions returning never (throwing functions) are handled correctly.
     */
    void test('memoization with never return type', async _ => {
        let index = 0;
        const neverFunction = (): never => {
            index++;
            throw new Error('This function never returns');
        };

        const memoized = memoize(neverFunction);

        // First call should throw
        throws(() => memoized());
        strictEqual(index, 1);

        // Second call should throw again (not cached)
        throws(() => memoized());
        strictEqual(index, 2);
    });
});

void describe('setup', () => {
    /**
     * Test: Cache configuration with custom options
     *
     * Validates that the setup() function correctly configures the cache
     * with custom options like maximum size and TTL (time-to-live).
     * This ensures that users can tune the cache behavior for their specific needs.
     */
    void test('cache setup with custom options', async _ => {
        setup({ max: 10, ttl: 1000 });
        strictEqual(getCacheStats().max, 10);
    });

    /**
     * Test: Setup with no parameters
     *
     * Validates that setup() works correctly when called without parameters,
     * using the default configuration.
     */
    void test('setup with no parameters', async _ => {
        setup();
        const stats = getCacheStats();
        strictEqual(stats.max, 100); // Default max value
        ok(stats.size >= 0); // Size should be non-negative
    });

    /**
     * Test: Multiple setup calls
     *
     * Validates that multiple calls to setup() work correctly and don't cause issues.
     */
    void test('multiple setup calls', async _ => {
        // First setup
        setup({ max: 50, ttl: 1000 });
        strictEqual(getCacheStats().max, 50);

        // Second setup
        setup({ max: 200, ttl: 5000 });
        strictEqual(getCacheStats().max, 200);

        // Third setup with defaults
        setup();
        strictEqual(getCacheStats().max, 100);
    });

    /**
     * Test: Cache migration when setup is called
     *
     * Validates that when setup() is called with a non-empty cache,
     * existing entries are migrated to the new cache instance.
     */
    void test('cache migration when setup is called', async _ => {
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
        ok(statsBefore.size > 0);

        // Setup new cache with different options
        setup({ max: 50, ttl: 2000 });

        // Verify cache still has entries (migrated)
        const statsAfter = getCacheStats();
        strictEqual(statsAfter.size, statsBefore.size);
        strictEqual(statsAfter.max, 50);

        // Verify cached results still work
        strictEqual(memoized(), 0); // Should return cached result

        // @ts-expect-error - we want to test the wrong usage of the function
        strictEqual(memoized('test'), 1); // Should return cached result

        strictEqual(index, 2); // Should not increment further
    });
});

void describe('clearCache', () => {
    /**
     * Test: Cache statistics and clearing functionality
     *
     * Validates the cache management functions:
     * - getCacheStats() returns accurate cache statistics
     * - clearCache() properly clears all cached entries
     *
     * This ensures that users can monitor and control the cache behavior.
     */
    void test('cache statistics and clearing', async _ => {
        let index = 0;
        const memoized = memoize(() => index++);
        memoized();
        memoized();
        ok(getCacheStats().size > 0);
        clearCache();
        strictEqual(getCacheStats().size, 0);
    });
});

void describe('getCacheStats', () => {
    /**
     * Test: Cache stats with empty cache
     *
     * Validates that getCacheStats() returns correct values when the cache is empty.
     */
    void test('cache stats with empty cache', async _ => {
        clearCache();
        const stats = getCacheStats();
        strictEqual(stats.size, 0);
        ok(stats.max > 0);
    });
});
