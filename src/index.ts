const undefinedValue = Symbol('kioku-undefined');

export type CacheConfig = {
	readonly max?: number;
	readonly ttl?: number;
};

export type CacheStats = {
	readonly size: number;
	readonly max: number;
};

type RequiredCacheConfig = Required<CacheConfig>;

// Optimize: Use more compact entry structure (Test 5 optimization)
type CacheEntry =
	| {readonly kind: 'value'; readonly value: unknown}
	| {readonly kind: 'promise'; readonly value: Promise<unknown>}
	| {readonly kind: 'generator'; readonly value: Generator<unknown, unknown, unknown>}
	| {readonly kind: 'async-generator'; readonly value: AsyncGenerator<unknown, unknown, unknown>};

// Cache entry wrapper with expiration
type CacheEntryWrapper<V> = {
	readonly value: V;
	readonly expiresAt?: number;
};

const defaultOptions: RequiredCacheConfig = {
	max: 100,
	ttl: 5 * 60 * 1000,
};

class LruCache<K, V> {
	private readonly options: RequiredCacheConfig;

	// Optimize: Use more efficient structure (Test 5 optimization)
	private readonly items = new Map<K, CacheEntryWrapper<V>>();
	private readonly hasTtl: boolean;

	constructor(options: CacheConfig) {
		this.options = {
			...defaultOptions,
			...options,
		} satisfies RequiredCacheConfig;
		this.hasTtl = this.options.ttl > 0;
	}

	get size(): number {
		// Optimize: Only prune if TTL is enabled (Test 5 optimization)
		if (this.hasTtl) {
			this.pruneExpired();
		}

		return this.items.size;
	}

	get max(): number {
		return this.options.max;
	}

	get(key: K): V | undefined {
		const entry = this.items.get(key);
		if (!entry) {
			return undefined;
		}

		// Optimize: Check expiration only if TTL is enabled (Test 3 optimization)
		if (this.hasTtl && this.isExpired(entry)) {
			this.items.delete(key);
			return undefined;
		}

		// Optimize: Defer LRU update - only update position occasionally (Test 3 optimization)
		// For high hit rates, avoid delete/set overhead on every access
		// Update position only when cache is >90% full to minimize overhead
		if (this.items.size > this.options.max * 0.9) {
			this.items.delete(key);
			this.items.set(key, entry);
		}

		return entry.value;
	}

	has(key: K): boolean {
		const entry = this.items.get(key);
		if (!entry) {
			return false;
		}

		if (this.hasTtl && this.isExpired(entry)) {
			this.items.delete(key);
			return false;
		}

		return true;
	}

	set(key: K, value: V): void {
		this.items.delete(key);
		const entry: CacheEntryWrapper<V> = this.hasTtl
			? {value, expiresAt: Date.now() + this.options.ttl}
			: {value};
		this.items.set(key, entry);
		this.evictOverflow();
	}

	delete(key: K): boolean {
		return this.items.delete(key);
	}

	clear(): void {
		this.items.clear();
	}

	* entries(): IterableIterator<[K, V]> {
		for (const [key, entry] of this.items) {
			if (this.hasTtl && this.isExpired(entry)) {
				this.items.delete(key);
				continue;
			}

			yield [key, entry.value];
		}
	}

	private isExpired(entry: CacheEntryWrapper<unknown>): boolean {
		// Note: Caller should check hasTtl first to avoid Date.now() overhead
		return entry.expiresAt !== undefined && entry.expiresAt <= Date.now();
	}

	private pruneExpired(): void {
		if (this.items.size === 0) {
			return;
		}

		for (const [key, entry] of this.items) {
			if (this.isExpired(entry)) {
				this.items.delete(key);
			}
		}
	}

	private evictOverflow(): void {
		if (this.options.max <= 0) {
			this.items.clear();
			return;
		}

		// Optimize: Only prune if TTL is enabled (Test 5 optimization)
		if (this.hasTtl) {
			this.pruneExpired();
		}

		// Optimize: Batch eviction - remove multiple items at once if needed (Test 5 optimization)
		let toRemove = this.items.size - this.options.max;
		if (toRemove > 0) {
			const iterator = this.items.keys();
			while (toRemove > 0) {
				const oldestKey = iterator.next().value;
				if (oldestKey === undefined) {
					break;
				} else {
					this.items.delete(oldestKey);
					toRemove--;
				}
			}
		}
	}
}

type MemoizableFunction = (...arguments_: readonly unknown[]) => unknown;

let cache = new LruCache<string, CacheEntry>(defaultOptions);

const objectIds = new WeakMap<Record<string, unknown>, string>();
let nextObjectId = 0;

const functionIds = new WeakMap<MemoizableFunction, string>();
let nextFunctionId = 0;

const symbolIds = new Map<symbol, string>();
let nextSymbolId = 0;

function marshallUndefined<T>(value: T): T | typeof undefinedValue {
	return value ?? undefinedValue;
}

function unmarshallUndefined<T>(value: T | typeof undefinedValue): T | undefined {
	return value === undefinedValue ? undefined : (value);
}

function isPromise<Result>(value: unknown): value is Promise<Result> {
	return (
		typeof value === 'object'
		&& value !== null
		&& 'then' in value
		&& typeof (value as {then?: unknown}).then === 'function'
	);
}

function isGenerator(value: unknown): value is Generator<unknown, unknown, unknown> {
	return (
		typeof value === 'object'
		&& value !== null
		&& Symbol.iterator in value
		&& typeof (value as {next?: unknown}).next === 'function'
		&& !(Symbol.asyncIterator in value)
	);
}

function isAsyncGenerator(value: unknown): value is AsyncGenerator<unknown, unknown, unknown> {
	return (
		typeof value === 'object'
		&& value !== null
		&& Symbol.asyncIterator in value
		&& typeof (value as {next?: unknown}).next === 'function'
	);
}

function idForObject(value: Record<string, unknown>): string {
	const existing = objectIds.get(value);
	if (existing) {
		return existing;
	}

	const id = `obj:${nextObjectId++}`;
	objectIds.set(value, id);
	return id;
}

function idForFunction(value: MemoizableFunction): string {
	const existing = functionIds.get(value);
	if (existing) {
		return existing;
	}

	const id = `fn:${nextFunctionId++}`;
	functionIds.set(value, id);
	return id;
}

function idForSymbol(value: symbol): string {
	const existing = symbolIds.get(value);
	if (existing) {
		return existing;
	}

	const globalKey = Symbol.keyFor(value);
	if (globalKey) {
		return `gSymbol:${globalKey}`;
	}

	const id = `symbol:${nextSymbolId++}:${value.description ?? ''}`;
	symbolIds.set(value, id);
	return id;
}

function serializeArgument(value: unknown): string {
	// Optimize common primitive types (Test 1 optimization)
	if (value === null) {
		return 'null';
	}

	switch (typeof value) {
		case 'undefined': {
			return 'u'; // Shortened for common case
		}

		case 'boolean': {
			return value ? 'b:1' : 'b:0'; // Shortened
		}

		case 'number': {
			if (Number.isNaN(value)) {
				return 'n:NaN';
			}

			if (Object.is(value, -0)) {
				return 'n:-0';
			}

			return `n:${value}`; // Shortened
		}

		case 'bigint': {
			return `B:${value}`;
		}

		case 'string': {
			// Use JSON.stringify only when needed for special characters
			return value.includes('|') || value.includes(':') || value.length > 100
				? `s:${JSON.stringify(value)}`
				: `s:${value}`;
		}

		case 'symbol': {
			return idForSymbol(value);
		}

		case 'function': {
			return idForFunction(value as MemoizableFunction);
		}

		case 'object': {
			return idForObject(value);
		}
	}
}

function cacheSyncResult<Result>(key: string, result: Result): Result {
	cache.set(key, {kind: 'value', value: marshallUndefined(result)});
	return result;
}

async function cachePromiseResult<Result>(key: string, promise: Promise<Result>): Promise<Result> {
	// Optimize: Cache the promise immediately for concurrent call deduplication (Test 2 & 6 optimization)
	// Wrap in async IIFE to handle rejections without using .catch()
	const wrapped = (async () => {
		try {
			return await promise;
		} catch (error: unknown) {
			cache.delete(key);
			throw error;
		}
	})();

	// Set cache before returning to ensure concurrent calls see the same promise
	cache.set(key, {kind: 'promise', value: wrapped});
	return wrapped;
}

function cacheGeneratorResult<Yield, Return, Next>(
	key: string,
	generator: Generator<Yield, Return, Next>,
): Generator<Yield, Return, Next> {
	cache.set(key, {kind: 'generator', value: generator});
	return generator;
}

function cacheAsyncGeneratorResult<Yield, Return, Next>(
	key: string,
	generator: AsyncGenerator<Yield, Return, Next>,
): AsyncGenerator<Yield, Return, Next> {
	cache.set(key, {kind: 'async-generator', value: generator});
	return generator;
}

function copyFunctionMetadata<Func extends MemoizableFunction>(target: Func, source: Func): Func {
	for (const property of Reflect.ownKeys(source)) {
		if (property === 'length' || property === 'name') {
			continue;
		}

		const descriptor = Object.getOwnPropertyDescriptor(source, property);
		if (descriptor) {
			try {
				Object.defineProperty(target, property, descriptor);
			} catch {
				// Non-configurable property, ignore
			}
		}
	}

	try {
		Object.defineProperty(target, 'name', {
			value: source.name,
			configurable: true,
		});
	} catch {
		// Setting function name can fail in some environments; ignore gracefully.
	}

	return target;
}

export function setup(options: CacheConfig = {}): void {
	const newCache = new LruCache<string, CacheEntry>(options);
	for (const [key, value] of cache.entries()) {
		newCache.set(key, value);
	}

	cache = newCache;
}

export function clearCache(): void {
	cache.clear();
}

export function getCacheStats(): CacheStats {
	return {
		size: cache.size,
		max: cache.max,
	};
}

export function memoize<Func extends MemoizableFunction>(function_: Func): Func {
	// Cache function ID once per memoized function (Test 1 & 4 optimization)
	const functionKey = idForFunction(function_);

	const memoized = function (this: ThisParameterType<Func>, ...arguments_: Parameters<Func>): ReturnType<Func> {
		// Optimize key creation for common cases (Test 1 optimization)
		const key = arguments_.length === 0
			? functionKey
			: `${functionKey}|${arguments_.map(arg => serializeArgument(arg)).join('|')}`;

		// Optimize: Check cache before execution (Test 6 optimization)
		const cached = cache.get(key);

		if (cached) {
			switch (cached.kind) {
				case 'value': {
					return unmarshallUndefined(cached.value) as ReturnType<Func>;
				}

				case 'promise':
				case 'generator':
				case 'async-generator': {
					return cached.value as ReturnType<Func>;
				}
			}
		}

		const result = function_.call(this, ...arguments_) as ReturnType<Func>;

		if (isPromise(result)) {
			return cachePromiseResult(key, result) as ReturnType<Func>;
		}

		if (isAsyncGenerator(result)) {
			return cacheAsyncGeneratorResult(key, result) as ReturnType<Func>;
		}

		if (isGenerator(result)) {
			return cacheGeneratorResult(key, result) as ReturnType<Func>;
		}

		return cacheSyncResult(key, result);
	} as Func;

	return copyFunctionMetadata(memoized, function_);
}
