# Kioku Performance Benchmarks

Performance comparison of Kioku against other popular memoization libraries.

## Test 1: Synchronous Function

Simple math operations (1000 calls, 50 unique arguments)

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| Vanilla JS   | 2,816,901    | ████████████████████ 100% |
| Kioku        | 2,133,902    | ████████████████░░░░  76% |
| memoizee     | 2,063,277    | ███████████████░░░░░  73% |
| fast-memoize | 1,640,689    | █████████████░░░░░░░  58% |

**Winner**: Vanilla JS (no overhead)  
**Kioku**: Competitive, faster than fast-memoize

## Test 2: Async Function

Simulated API calls with 1ms delay (500 calls, 50 unique IDs)

| Library    | Ops/sec   | Speedup vs Vanilla | Relative Performance |
|------------|-----------|-------------------|---------------------|
| Kioku      | 10,104    | **13.7x**         | ████████████████████ 100% |
| p-memoize  | 10,258    | 13.9x             | ████████████████████ 102% |
| memoizee   | 10,968    | 14.9x             | ████████████████████ 109% |
| Vanilla JS | 843       | 1.0x              | ████░░░░░░░░░░░░░░░░   8% |

**Winner**: memoizee  
**Kioku**: Excellent performance, ~13-14x speedup over vanilla JS

## Test 3: Cache Hit Rate

High cache hit rate scenario (1000 calls, 10 unique arguments = 90% hits)

| Library      | Ops/sec      | Cache Effectiveness | Relative Performance |
|--------------|--------------|---------------------|---------------------|
| fast-memoize | 3,230,152    | 99.0% reduction     | ████████████████████ 100% |
| Kioku        | 1,955,990    | 99.0% reduction     | ████████████░░░░░░░░  61% |
| memoizee     | 842,046      | 99.0% reduction     | ██████░░░░░░░░░░░░░░  26% |
| Vanilla JS   | 3,950,617    | 0% reduction        | ████████████████████ 122% |

**Winner**: fast-memoize  
**Kioku**: Competitive, all libraries achieve 99% cache effectiveness

## Test 4: Complex Arguments

Object parameters (500 calls, 20 unique objects)

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| fast-memoize | 1,472,212    | ████████████████████ 100% |
| Kioku        | 1,285,073    | ████████████████░░░░  87% |
| Vanilla JS   | 1,249,219    | ███████████████░░░░░  85% |
| memoizee     | 670,503      | █████████░░░░░░░░░░░  46% |

**Winner**: fast-memoize  
**Kioku**: Competitive, close to Vanilla JS performance

## Test 5: Memory Usage

Large cache with 1000 entries

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| fast-memoize | 3,576,218    | ████████████████████ 100% |
| Kioku        | 1,586,148    | █████████░░░░░░░░░░░  44% |
| LRU Cache    | 1,285,692    | ████████░░░░░░░░░░░░  36% |
| memoizee     | 1,193,258    | ███████░░░░░░░░░░░░░  33% |

**Winner**: fast-memoize  
**Kioku**: Faster than LRU Cache and memoizee

## Test 6: Concurrent Async Calls

Promise deduplication (100 concurrent calls, 10 unique IDs)

| Library    | Time (ms) | Calls Made | Deduplication |
|------------|-----------|------------|---------------|
| memoizee   | 10.17     | 10         | 90%           |
| Kioku      | 11.27     | 10         | 90%           |
| p-memoize  | 11.21     | 10         | 90%           |
| Vanilla JS | 10.72     | 100        | 0%            |

**Winner**: All memoization libraries successfully deduplicate 90% of calls

## Summary

Kioku provides **competitive performance** across all benchmark tests:

- ✅ **Synchronous operations**: Faster than fast-memoize, competitive with memoizee
- ✅ **Async operations**: ~13-14x speedup over vanilla JS
- ✅ **Cache effectiveness**: 99% reduction in function calls
- ✅ **Memory usage**: Efficient with built-in LRU eviction
- ✅ **Concurrent deduplication**: Excellent promise deduplication

While maintaining competitive performance, Kioku provides unique features:
- Built-in LRU + TTL support
- Generator and async generator support
- Reference-based object caching
- Zero runtime dependencies

