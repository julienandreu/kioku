# Kioku Performance Benchmarks

Performance comparison of Kioku against other popular memoization libraries.

## Test 1: Synchronous Function

Simple math operations (1000 calls, 50 unique arguments)

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| Vanilla JS   | 8,080,808    | ████████████████████ 100% |
| memoizee     | 2,057,965    | █████░░░░░░░░░░░░░░░  25% |
| Kioku        | 1,758,498    | ████░░░░░░░░░░░░░░░░  22% |
| fast-memoize | 1,541,523    | ████░░░░░░░░░░░░░░░░  19% |

**Winner**: Vanilla JS (no overhead)  
**Kioku**: Competitive, faster than fast-memoize

## Test 2: Async Function

Simulated API calls with 1ms delay (500 calls, 50 unique IDs)

| Library    | Ops/sec   | Speedup vs Vanilla | Relative Performance |
|------------|-----------|-------------------|---------------------|
| **Kioku**  | **10,421**| **12.5x**         | ████████████████████ 100% |
| p-memoize  | 9,599     | 11.5x             | █████████████████░░░░  92% |
| memoizee   | 9,439     | 11.3x             | █████████████████░░░░  91% |
| Vanilla JS | 836       | 1.0x              | ████░░░░░░░░░░░░░░░░   8% |

**Winner**: Kioku  
**Kioku**: Fastest async performance, ~12.5x speedup over vanilla JS

## Test 3: Cache Hit Rate

High cache hit rate scenario (1000 calls, 10 unique arguments = 90% hits)

| Library      | Ops/sec      | Cache Effectiveness | Relative Performance |
|--------------|--------------|---------------------|---------------------|
| **Kioku**    | **1,882,502**| **99.0% reduction** | ████████████████████ 100% |
| fast-memoize | 867,397      | 99.0% reduction     | █████░░░░░░░░░░░░░░░  46% |
| memoizee     | 587,400      | 99.0% reduction     | ███░░░░░░░░░░░░░░░░░  31% |
| Vanilla JS   | 735,768      | 0% reduction        | ████░░░░░░░░░░░░░░░░  39% |

**Winner**: Kioku  
**Kioku**: Fastest cache hit rate performance, all libraries achieve 99% cache effectiveness

## Test 4: Complex Arguments

Object parameters (500 calls, 20 unique objects)

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| Vanilla JS   | 4,516,345    | ████████████████████ 100% |
| Kioku        | 1,620,746    | ███████░░░░░░░░░░░░░  36% |
| fast-memoize | 1,520,723    | ██████░░░░░░░░░░░░░░  34% |
| memoizee     | 633,078      | ███░░░░░░░░░░░░░░░░░  14% |

**Winner**: Vanilla JS (no overhead)  
**Kioku**: Competitive, faster than fast-memoize and memoizee

## Test 5: Memory Usage

Large cache with 1000 entries

| Library      | Ops/sec      | Relative Performance |
|--------------|--------------|---------------------|
| fast-memoize | 3,659,103    | ████████████████████ 100% |
| Kioku        | 1,215,436    | ██████░░░░░░░░░░░░░░  33% |
| memoizee     | 1,192,546    | ██████░░░░░░░░░░░░░░  33% |
| LRU Cache    | 1,053,232    | █████░░░░░░░░░░░░░░░  29% |

**Winner**: fast-memoize  
**Kioku**: Competitive with memoizee, faster than LRU Cache

## Test 6: Concurrent Async Calls

Promise deduplication (100 concurrent calls, 10 unique IDs)

| Library    | Time (ms) | Calls Made | Deduplication |
|------------|-----------|------------|---------------|
| memoizee   | 10.22     | 10         | 90%           |
| p-memoize  | 10.77     | 10         | 90%           |
| Kioku      | 11.23     | 10         | 90%           |
| Vanilla JS | 11.82     | 100        | 0%            |

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

