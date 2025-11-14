# Kioku Performance Benchmarks

Performance comparison of Kioku against other popular memoization libraries.

## Results

See [RESULTS.md](./RESULTS.md) for detailed benchmark results with visual charts.

## Running Benchmarks

```bash
cd benchmark
npm install
npm run benchmark
```

## Libraries Compared

- **Kioku** - This library
- **p-memoize** - [sindresorhus/p-memoize](https://github.com/sindresorhus/p-memoize)
- **memoizee** - [medikoo/memoizee](https://github.com/medikoo/memoizee)
- **fast-memoize** - [caiogondim/fast-memoize.js](https://github.com/caiogondim/fast-memoize.js)
- **LRU Cache** - Manual LRU cache implementation

## Test Scenarios

1. **Synchronous Function** - Simple math operations
2. **Async Function** - Simulated API calls with network delays
3. **Cache Hit Rate** - High cache hit rate scenario (90% hits)
4. **Complex Arguments** - Object and array parameters
5. **Memory Usage** - Large cache with 1000 entries
6. **Concurrent Async Calls** - Promise deduplication under concurrent load

