#!/usr/bin/env tsx
/**
 * Performance Benchmark: Kioku vs Other Memoization Libraries
 */

import {performance} from 'node:perf_hooks';
import pMemoize from 'p-memoize';
import memoizee from 'memoizee';
import fastMemoize from 'fast-memoize';
import {LRUCache} from 'lru-cache';
import {
	clearCache,
	memoize,
	setup,
} from '../src/index.js';

type BenchmarkResult = {
	name: string;
	time: number;
	opsPerSec: number;
	memoryDelta?: number;
};

function formatNumber(number_: number): string {
	return new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(number_);
}

function formatBytes(bytes: number): string {
	if (bytes === 0) {
		return '0 B';
	}

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${formatNumber(bytes / k ** i)} ${sizes[i]}`;
}

async function benchmark<T extends readonly unknown[]>(
	name: string,
	fn: (...args: T) => unknown,
	args: T[],
	warmup = 10,
): Promise<BenchmarkResult> {
	for (let i = 0; i < warmup; i++) {
		await fn(...args[i % args.length]!);
	}

	if (globalThis.gc) {
		globalThis.gc();
	}

	const memBefore = process.memoryUsage().heapUsed;
	const start = performance.now();

	for (const argSet of args) {
		await fn(...argSet);
	}

	const end = performance.now();
	const memAfter = process.memoryUsage().heapUsed;

	const time = end - start;
	const opsPerSec = (args.length / time) * 1000;
	const memoryDelta = memAfter > memBefore ? memAfter - memBefore : undefined;

	return {
		name, time, opsPerSec, memoryDelta,
	};
}

function printResults(results: BenchmarkResult[]): void {
	console.log('\n📊 Benchmark Results\n');
	console.log('┌─────────────────────┬──────────────┬──────────────┬──────────────┐');
	console.log('│ Library             │ Time (ms)    │ Ops/sec      │ Memory Δ     │');
	console.log('├─────────────────────┼──────────────┼──────────────┼──────────────┤');

	for (const result of results) {
		const time = formatNumber(result.time);
		const ops = formatNumber(result.opsPerSec);
		const mem = result.memoryDelta === undefined ? 'N/A' : formatBytes(result.memoryDelta);
		const name = result.name.padEnd(19);
		console.log(`│ ${name} │ ${time.padStart(12)} │ ${ops.padStart(12)} │ ${mem.padStart(12)} │`);
	}

	console.log('└─────────────────────┴──────────────┴──────────────┴──────────────┘');

	const fastest = results.reduce((previous, current) =>
		current.opsPerSec > previous.opsPerSec ? current : previous);
	console.log(`\n🏆 Fastest: ${fastest.name} (${formatNumber(fastest.opsPerSec)} ops/sec)`);
}

async function testSyncSimple(): Promise<void> {
	console.log('\n🧮 Test 1: Synchronous Function - Simple Math');
	console.log('─────────────────────────────────────────────────');

	const expensiveFn = (a: number, b: number): number => Math.hypot(a, b);
	const args = Array.from({length: 1000}, (_, i) => [i % 50, (i * 2) % 50] as [number, number]);

	const results: BenchmarkResult[] = [];
	results.push(await benchmark('Vanilla JS', expensiveFn, args));

	setup({max: 100, ttl: 0});
	clearCache();
	results.push(await benchmark('Kioku', memoize(expensiveFn), args));
	results.push(await benchmark('fast-memoize', fastMemoize(expensiveFn), args));
	results.push(await benchmark('memoizee', memoizee(expensiveFn, {max: 100}), args));

	printResults(results);
}

async function testAsync(): Promise<void> {
	console.log('\n🌐 Test 2: Async Function - Simulated API Calls');
	console.log('─────────────────────────────────────────────────');

	const fetchData = async (id: string): Promise<string> => {
		await new Promise(resolve => {
			setTimeout(resolve, 1);
		});
		return `data-${id}`;
	};

	const args = Array.from({length: 500}, (_, i) => [`user-${i % 50}`] as [string]);
	const results: BenchmarkResult[] = [];

	results.push(await benchmark('Vanilla JS', fetchData, args));

	setup({max: 100, ttl: 0});
	clearCache();
	results.push(await benchmark('Kioku', memoize(fetchData), args));
	results.push(await benchmark('p-memoize', pMemoize(fetchData, {cache: new Map()}), args));
	results.push(await benchmark('memoizee', memoizee(fetchData, {max: 100}), args));

	printResults(results);
}

async function testCacheHitRate(): Promise<void> {
	console.log('\n🎯 Test 3: Cache Hit Rate - High Hit Rate (90% hits)');
	console.log('─────────────────────────────────────────────────');

	let callCount = 0;
	const compute = (x: number): number => {
		callCount++;
		return x * x;
	};

	const uniqueArgs = Array.from({length: 10}, (_, i) => [i] as [number]);
	const args = Array.from({length: 1000}, (_, i) => [uniqueArgs[i % uniqueArgs.length]![0]] as [number]);

	const results: BenchmarkResult[] = [];

	callCount = 0;
	results.push(await benchmark('Vanilla JS', compute, args));
	const vanillaCalls = callCount;

	setup({max: 100, ttl: 0});
	clearCache();
	callCount = 0;
	const kiokuFn = memoize(compute);
	results.push(await benchmark('Kioku', kiokuFn, args));
	const kiokuCalls = callCount;

	callCount = 0;
	const fastFn = fastMemoize(compute);
	results.push(await benchmark('fast-memoize', fastFn, args));
	const fastCalls = callCount;

	callCount = 0;
	const memoizeeFn = memoizee(compute, {max: 100});
	results.push(await benchmark('memoizee', memoizeeFn, args));
	const memoizeeCalls = callCount;

	printResults(results);

	console.log('\n📈 Cache Effectiveness:');
	console.log(`  Vanilla JS:  ${vanillaCalls} calls (no caching)`);
	console.log(`  Kioku:       ${kiokuCalls} calls (${((1 - kiokuCalls / vanillaCalls) * 100).toFixed(1)}% reduction)`);
	console.log(`  fast-memoize: ${fastCalls} calls (${((1 - fastCalls / vanillaCalls) * 100).toFixed(1)}% reduction)`);
	console.log(`  memoizee:    ${memoizeeCalls} calls (${((1 - memoizeeCalls / vanillaCalls) * 100).toFixed(1)}% reduction)`);
}

async function testComplexArgs(): Promise<void> {
	console.log('\n🔷 Test 4: Complex Arguments - Objects');
	console.log('─────────────────────────────────────────────────');

	const processUser = (user: {id: string; name: string}): string => `${user.id}:${user.name}`;
	const users = Array.from({length: 20}, (_, i) => ({id: `id-${i}`, name: `User-${i}`}));
	const args = Array.from({length: 500}, (_, i) => [users[i % users.length]!] as [{id: string; name: string}]);

	const results: BenchmarkResult[] = [];
	results.push(await benchmark('Vanilla JS', processUser, args));

	setup({max: 100, ttl: 0});
	clearCache();
	results.push(await benchmark('Kioku', memoize(processUser), args));

	const fastFn = fastMemoize(processUser, {
		cache: {create: () => new Map()},
		serializer: (args: [{id: string; name: string}]) => JSON.stringify(args),
	});
	results.push(await benchmark('fast-memoize', fastFn, args));

	const memoizeeFn = memoizee(processUser, {
		max: 100,
		normalizer: (args: [{id: string; name: string}]) => JSON.stringify(args),
	});
	results.push(await benchmark('memoizee', memoizeeFn, args));

	printResults(results);
}

async function testMemoryUsage(): Promise<void> {
	console.log('\n💾 Test 5: Memory Usage - Large Cache (1000 entries)');
	console.log('─────────────────────────────────────────────────');

	const compute = (x: number): number => x * x;
	const args = Array.from({length: 1000}, (_, i) => [i] as [number]);
	const results: BenchmarkResult[] = [];

	setup({max: 1000, ttl: 0});
	clearCache();
	results.push(await benchmark('Kioku', memoize(compute), args));

	const lruCache = new LRUCache<string, number>({max: 1000});
	const lruFn = (x: number): number => {
		const key = String(x);
		const cached = lruCache.get(key);
		if (cached !== undefined) {
			return cached;
		}

		const result = compute(x);
		lruCache.set(key, result);
		return result;
	};

	results.push(await benchmark('LRU Cache', lruFn, args));
	results.push(await benchmark('fast-memoize', fastMemoize(compute), args));
	results.push(await benchmark('memoizee', memoizee(compute, {max: 1000}), args));

	printResults(results);
}

async function testConcurrentAsync(): Promise<void> {
	console.log('\n⚡ Test 6: Concurrent Async Calls (Deduplication)');
	console.log('─────────────────────────────────────────────────');

	let callCount = 0;
	const fetchData = async (id: string): Promise<string> => {
		callCount++;
		await new Promise(resolve => {
			setTimeout(resolve, 10);
		});
		return `data-${id}`;
	};

	const testConcurrent = async (
		name: string,
		fn: (id: string) => Promise<string>,
	): Promise<{name: string; time: number; calls: number}> => {
		callCount = 0;
		const start = performance.now();
		const promises = Array.from({length: 100}, async (_, i) => fn(`id-${i % 10}`));
		await Promise.all(promises);
		return {name, time: performance.now() - start, calls: callCount};
	};

	const results: Array<{name: string; time: number; calls: number}> = [];
	results.push(await testConcurrent('Vanilla JS', fetchData));

	setup({max: 100, ttl: 0});
	clearCache();
	results.push(await testConcurrent('Kioku', memoize(fetchData)));
	results.push(await testConcurrent('p-memoize', pMemoize(fetchData, {cache: new Map()})));
	results.push(await testConcurrent('memoizee', memoizee(fetchData, {max: 100})));

	console.log('\n┌─────────────────────┬──────────────┬──────────────┐');
	console.log('│ Library             │ Time (ms)    │ Calls Made   │');
	console.log('├─────────────────────┼──────────────┼──────────────┤');

	for (const result of results) {
		const time = formatNumber(result.time);
		const name = result.name.padEnd(19);
		console.log(`│ ${name} │ ${time.padStart(12)} │ ${String(result.calls).padStart(12)} │`);
	}

	console.log('└─────────────────────┴──────────────┴──────────────┘');
	console.log('\n💡 Lower "Calls Made" = Better deduplication');
}

async function main(): Promise<void> {
	console.log('🚀 Kioku Performance Benchmark');
	console.log('═══════════════════════════════════════════════════════');
	console.log('Comparing: Kioku vs p-memoize vs memoizee vs fast-memoize');
	console.log('═══════════════════════════════════════════════════════');

	await testSyncSimple();
	await testAsync();
	await testCacheHitRate();
	await testComplexArgs();
	await testMemoryUsage();
	await testConcurrentAsync();

	console.log('\n✅ Benchmark completed!\n');
}

main().catch(console.error);

