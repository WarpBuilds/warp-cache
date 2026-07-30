# `@warpbuilds/cache`

> Cache client library for [WarpBuild](https://warpbuild.com)'s cache service.


## Usage

This package is used by [`WarpBuilds/cache`](https://github.com/WarpBuilds/cache) and the WarpBuild `setup-*` actions. To add caching to a workflow, use one of those actions rather than this package directly.

#### Save Cache

Saves a cache containing the files in `paths` using the `key` provided. The files would be compressed using zstandard compression algorithm if zstd is installed, otherwise gzip is used. Returns a positive id if the cache was saved, or `-1` if it was not. Losing a race to another job saving the same key returns `-1` rather than throwing.

```js
import * as cache from '@warpbuilds/cache';
const paths = [
    'node_modules',
    'packages/*/node_modules/'
]
const key = 'npm-foobar-d5ea0750'
const cacheId = await cache.saveCache(paths, key)
```

#### Restore Cache

Restores a cache based on `key` and `restoreKeys` to the `paths` provided. Function returns the cache key for cache hit and returns undefined if cache not found.

```js
import * as cache from '@warpbuilds/cache';
const paths = [
    'node_modules',
    'packages/*/node_modules/'
]
const key = 'npm-foobar-d5ea0750'
const restoreKeys = [
    'npm-foobar-',
    'npm-'
]
const cacheKey = await cache.restoreCache(paths, key, restoreKeys)
```

##### Cache segment restore timeout

A cache gets downloaded in multiple segments of fixed sizes. Sometimes, a segment download gets stuck which causes the workflow job to be stuck forever and fail. The segment download timeout allows the segment download to get aborted and hence allows the job to proceed with a cache miss.

Default value of this timeout is 10 minutes and can be customized by specifying an environment variable named `SEGMENT_DOWNLOAD_TIMEOUT_MINS` with timeout value in minutes.


