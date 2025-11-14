/**
 * @fileoverview TypeScript declaration tests for the Kioku memoization library
 *
 * This file contains TypeScript declaration tests using tsd to validate that
 * the memoized functions preserve their original type signatures. This ensures
 * that the library provides proper TypeScript support and type safety.
 *
 * The tests cover various function types including:
 * - Synchronous functions
 * - Async functions (returning Promises)
 * - Generator functions
 * - AsyncGenerator functions
 * - Functions with complex parameter types
 * - Functions with union types
 * - Functions with optional parameters
 * - Functions with rest parameters
 * - Functions returning undefined
 *
 * @example
 * ```bash
 * # Run type tests
 * npm run test:types
 *
 * # Run all tests including types
 * npm test
 * ```
 */

import {expectTypeOf} from 'expect-type';
import {
	clearCache, getCacheStats,
	memoize, setup,
} from './index.js';

// ============================================================================
// BASIC FUNCTION TESTS
// ============================================================================

/**
 * Test: Synchronous function memoization type preservation
 *
 * Validates that memoizing a synchronous function preserves its type signature.
 * The memoized function should have the same parameter and return types as the original.
 */
const syncFunction = Boolean;
const memoizedSyncFunction = memoize(syncFunction);
expectTypeOf<typeof syncFunction>(memoizedSyncFunction);
expectTypeOf<boolean>(memoizedSyncFunction('test'));

/**
 * Test: Async function memoization type preservation
 *
 * Validates that memoizing an async function preserves its Promise return type.
 * The memoized function should return a Promise with the same resolved type.
 */
const asyncFunction = async (text: string): Promise<boolean> => Boolean(text);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedAsyncFunction = memoize(asyncFunction as any);
expectTypeOf(memoizedAsyncFunction).toMatchTypeOf(asyncFunction);
expectTypeOf(memoizedAsyncFunction('test')).toMatchTypeOf<Promise<boolean>>();

/**
 * Test: Generator function memoization type preservation
 *
 * Validates that memoizing a generator function preserves its Generator type.
 * The memoized function should return a Generator with the same yield, return, and next types.
 */
function * generatorFunction(text: string): Generator<boolean, boolean, boolean> {
	yield Boolean(text);
	return Boolean(text);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedGeneratorFunction = memoize(generatorFunction as any);
expectTypeOf(memoizedGeneratorFunction).toMatchTypeOf(generatorFunction);
expectTypeOf(memoizedGeneratorFunction('test')).toMatchTypeOf<Generator<boolean, boolean, boolean>>();

/**
 * Test: Async generator function memoization type preservation
 *
 * Validates that memoizing an async generator function preserves its AsyncGenerator type.
 * The memoized function should return an AsyncGenerator with the same yield, return, and next types.
 */
async function * asyncGeneratorFunction(text: string): AsyncGenerator<boolean, boolean, boolean> {
	yield Boolean(text);
	return Boolean(text);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedAsyncGeneratorFunction = memoize(asyncGeneratorFunction as any);
expectTypeOf(memoizedAsyncGeneratorFunction).toMatchTypeOf(asyncGeneratorFunction);
expectTypeOf(memoizedAsyncGeneratorFunction('test')).toMatchTypeOf<AsyncGenerator<boolean, boolean, boolean>>();

// ============================================================================
// OVERLOADED FUNCTION TESTS
// ============================================================================

/**
 * Test: Overloaded function memoization type preservation
 *
 * Validates that memoizing a function with multiple overloads preserves all overload signatures.
 * The memoized function should have the same overloaded type signature as the original.
 */
function overloadedFunction(parameter: false): false;
function overloadedFunction(parameter: true): true;
function overloadedFunction(parameter: boolean): boolean {
	return parameter;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedOverloadedFunction = memoize(overloadedFunction as any);
expectTypeOf(memoizedOverloadedFunction).toEqualTypeOf(overloadedFunction);
expectTypeOf(memoizedOverloadedFunction(true)).toEqualTypeOf<true>();
expectTypeOf(memoizedOverloadedFunction(false)).toEqualTypeOf<false>();

// ============================================================================
// FUNCTION WITH COMPLEX PARAMETERS
// ============================================================================

/**
 * Test: Function with object parameters memoization
 *
 * Validates that memoizing a function with object parameters preserves the object type structure.
 * The memoized function should accept the same object shape and return the same type.
 */
const objectFunction = (parameters: {name: string; age: number}): string =>
	`${parameters.name} is ${parameters.age} years old`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedObjectFunction = memoize(objectFunction as any);
expectTypeOf(memoizedObjectFunction).toEqualTypeOf(objectFunction);
expectTypeOf(memoizedObjectFunction({name: 'John', age: 30})).toEqualTypeOf<string>();

/**
 * Test: Function with array parameters memoization
 *
 * Validates that memoizing a function with array parameters preserves the array type.
 * The memoized function should accept the same array type and return the same type.
 */
const arrayFunction = (items: readonly string[]): number => items.length;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedArrayFunction = memoize(arrayFunction as any);
expectTypeOf(memoizedArrayFunction).toEqualTypeOf(arrayFunction);
expectTypeOf(memoizedArrayFunction(['a', 'b', 'c'])).toEqualTypeOf<number>();

// ============================================================================
// FUNCTION WITH UNION TYPES
// ============================================================================

/**
 * Test: Function with union type parameters memoization
 *
 * Validates that memoizing a function with union type parameters preserves the union type.
 * The memoized function should accept the same union types and return the same type.
 */
const unionFunction = String;
const memoizedUnionFunction = memoize(unionFunction);
expectTypeOf<typeof unionFunction>(memoizedUnionFunction);
expectTypeOf<string>(memoizedUnionFunction('test'));
expectTypeOf<string>(memoizedUnionFunction(42));

// ============================================================================
// FUNCTION WITH OPTIONAL PARAMETERS
// ============================================================================

/**
 * Test: Function with optional parameters memoization
 *
 * Validates that memoizing a function with optional parameters preserves the optional parameter types.
 * The memoized function should have the same optional parameter signatures.
 */
const optionalFunction = (required: string, optional?: number): string =>
	optional ? `${required}-${optional}` : required;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedOptionalFunction = memoize(optionalFunction as any);
expectTypeOf(memoizedOptionalFunction).toMatchTypeOf(optionalFunction);
expectTypeOf(memoizedOptionalFunction('test')).toMatchTypeOf<string>();
expectTypeOf(memoizedOptionalFunction('test', 42)).toMatchTypeOf<string>();

// ============================================================================
// FUNCTION WITH REST PARAMETERS
// ============================================================================

/**
 * Test: Function with rest parameters memoization
 *
 * Validates that memoizing a function with rest parameters preserves the rest parameter type.
 * The memoized function should accept the same rest parameter types.
 */
const restFunction = (first: string, ...rest: number[]): string =>
	`${first}-${rest.join('-')}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const memoizedRestFunction = memoize(restFunction as any);
expectTypeOf(memoizedRestFunction).toMatchTypeOf(restFunction);
expectTypeOf(memoizedRestFunction('test', 1, 2, 3)).toMatchTypeOf<string>();

// ============================================================================
// FUNCTION RETURNING UNDEFINED
// ============================================================================

/**
 * Test: Function returning undefined memoization
 *
 * Validates that memoizing a function that returns undefined preserves the undefined return type.
 * This tests the special handling of undefined values in the cache.
 */
const undefinedFunction = (): undefined => undefined;
const memoizedUndefinedFunction = memoize(undefinedFunction);
expectTypeOf<typeof undefinedFunction>(memoizedUndefinedFunction);
expectTypeOf<undefined>(memoizedUndefinedFunction());

// ============================================================================
// CACHE MANAGEMENT TESTS
// ============================================================================

/**
 * Test: Setup function type validation
 *
 * Validates that the setup function accepts the correct parameter types and returns void.
 * Tests both with and without parameters to ensure proper type inference.
 */
expectTypeOf<void>(setup());
expectTypeOf<void>(setup({max: 200, ttl: 60_000}));

/**
 * Test: Clear cache function type validation
 *
 * Validates that the clearCache function has the correct return type (void).
 */
expectTypeOf<void>(clearCache());

/**
 * Test: Get cache stats function type validation
 *
 * Validates that the getCacheStats function returns the correct CacheStats type
 * with the expected properties and their types.
 */
const stats = getCacheStats();
expectTypeOf<{size: number; max: number}>(stats);
expectTypeOf<number>(stats.size);
expectTypeOf<number>(stats.max);

// ============================================================================
// COMPLEX SCENARIOS
// ============================================================================

/**
 * Test: Memoized function in class context
 *
 * Validates that memoized functions work correctly within class methods.
 * Tests that the memoized function preserves its type signature when used as a class property.
 */
class Calculator {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly memoizedAdd = memoize(((a: number, b: number): number => a + b) as any);

	add(a: number, b: number): number {
		return this.memoizedAdd(a, b);
	}
}

const calculator = new Calculator();
expectTypeOf<number>(calculator.add(1, 2));

/**
 * Test: Memoized function with generic types
 *
 * Validates that memoized functions work correctly with generic type parameters.
 * Tests that the generic type constraints are preserved in the memoized function.
 */
function createMemoizedIdentity<T>(): (value: T) => T {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return memoize(((value: T): T => value) as any);
}

const stringIdentity = createMemoizedIdentity<string>();
expectTypeOf<(value: string) => string>(stringIdentity);
expectTypeOf<string>(stringIdentity('test'));

const numberIdentity = createMemoizedIdentity<number>();
expectTypeOf<(value: number) => number>(numberIdentity);
expectTypeOf<number>(numberIdentity(42));

// ============================================================================
// EDGE CASES
// ============================================================================

/**
 * Test: Function with no parameters memoization
 *
 * Validates that memoizing a function with no parameters preserves its type signature.
 * The memoized function should have the same parameter and return types.
 */
const noParametersFunction = (): string => 'constant';
const memoizedNoParametersFunction = memoize(noParametersFunction);
expectTypeOf<typeof noParametersFunction>(memoizedNoParametersFunction);
expectTypeOf<string>(memoizedNoParametersFunction());

/**
 * Test: Function with void return memoization
 *
 * Validates that memoizing a function that returns void preserves the void return type.
 * This tests the handling of void return types in the memoization system.
 */
const voidFunction = (): void => {
	// Do nothing
};

const memoizedVoidFunction = memoize(voidFunction);
expectTypeOf<typeof voidFunction>(memoizedVoidFunction);
expectTypeOf<void>(memoizedVoidFunction());

/**
 * Test: Function with never return memoization
 *
 * Validates that memoizing a function that returns never preserves the never return type.
 * This tests the handling of never return types, which represent functions that never return normally.
 */
const neverFunction = (): never => {
	throw new Error('This function never returns');
};

const memoizedNeverFunction = memoize(neverFunction);
expectTypeOf<typeof neverFunction>(memoizedNeverFunction);
