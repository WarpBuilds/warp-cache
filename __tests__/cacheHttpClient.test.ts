import {downloadCache, getCacheVersion} from '../src/internal/cacheHttpClient.js'
import {CompressionMethod} from '../src/internal/constants.js'
import * as downloadUtils from '../src/internal/downloadUtils.js'

jest.mock('../src/internal/downloadUtils')

test('getCacheVersion with one path returns version', async () => {
  const paths = ['node_modules']
  const result = getCacheVersion(paths, undefined, true, true)
  expect(result).toEqual(
    'b3e0c6cb5ecf32614eeb2997d905b9c297046d7cbf69062698f25b14b4cb0985'
  )
})

test('getCacheVersion with multiple paths returns version', async () => {
  const paths = ['node_modules', 'dist']
  const result = getCacheVersion(paths, undefined, true, true)
  expect(result).toEqual(
    '165c3053bc646bf0d4fac17b1f5731caca6fe38e0e464715c0c3c6b6318bf436'
  )
})

test('getCacheVersion with zstd compression returns version', async () => {
  const paths = ['node_modules']
  const result = getCacheVersion(paths, CompressionMethod.Zstd, true, true)

  expect(result).toEqual(
    '273877e14fd65d270b87a198edbfa2db5a43de567c9a548d2a2505b408befe24'
  )
})

test('getCacheVersion with gzip compression returns version', async () => {
  const paths = ['node_modules']
  const result = getCacheVersion(paths, CompressionMethod.Gzip, true, true)

  expect(result).toEqual(
    '470e252814dbffc9524891b17cf4e5749b26c1b5026e63dd3f00972db2393117'
  )
})

test('getCacheVersion with enableCrossOsArchive as false returns version on windows', async () => {
  if (process.platform === 'win32') {
    const paths = ['node_modules']
    const result = getCacheVersion(paths, undefined, false, true)

    expect(result).toEqual(
      '2db19d6596dc34f51f0043120148827a264863f5c6ac857569c2af7119bad14e'
    )
  }
})

// The default path — cross-arch off — is what nearly every real cache uses,
// and it puts process.arch in the hash. Pinning per-arch keeps the assertion
// falsifiable without making it machine-dependent. If these move, every
// existing cache entry on that architecture becomes unreachable.
const versionByArch: {[arch: string]: string} = {
  x64: '4db507e773d235ae08e036b0be97988495ca65afc7d73e7b24b7f681cc177a7c',
  arm64: 'e75e9f4216900faee512f75905962d331834013fcf62fa550a909626526ec654'
}

test('getCacheVersion includes the architecture when cross-arch is off', async () => {
  const expected = versionByArch[process.arch]
  if (!expected) {
    throw new Error(
      `No pinned cache version for arch "${process.arch}". Add one rather than skipping.`
    )
  }

  expect(getCacheVersion(['node_modules'], undefined, true, false)).toEqual(
    expected
  )
})

test('getCacheVersion drops the architecture when cross-arch is on', async () => {
  expect(getCacheVersion(['node_modules'], undefined, true, true)).not.toEqual(
    getCacheVersion(['node_modules'], undefined, true, false)
  )
})

test('downloadCache uses the concurrent http-client for s3', async () => {
  const concurrentMock = jest.spyOn(
    downloadUtils,
    'downloadCacheHttpClientConcurrent'
  )

  const archiveLocation = 'https://s3.test/download'
  const archivePath = '/foo/bar'

  await downloadCache('s3', archiveLocation, archivePath)

  expect(concurrentMock).toHaveBeenCalledTimes(1)
  expect(concurrentMock).toHaveBeenCalledWith(archiveLocation, archivePath, {
    timeoutInMs: 30000
  })
})

test('downloadCache fails for gcs without a token', async () => {
  const concurrentMock = jest.spyOn(
    downloadUtils,
    'downloadCacheHttpClientConcurrent'
  )

  await expect(
    downloadCache('gcs', 'gs://bucket/key', '/foo/bar')
  ).rejects.toThrowError(
    'Unable to download cache from GCS. GCP token is not provided.'
  )

  expect(concurrentMock).toHaveBeenCalledTimes(0)
})

test('downloadCache does nothing for an unknown provider', async () => {
  const concurrentMock = jest.spyOn(
    downloadUtils,
    'downloadCacheHttpClientConcurrent'
  )
  const multipartGCPMock = jest.spyOn(downloadUtils, 'downloadCacheMultipartGCP')

  await downloadCache('nope', 'https://example.test/x', '/foo/bar')

  expect(concurrentMock).toHaveBeenCalledTimes(0)
  expect(multipartGCPMock).toHaveBeenCalledTimes(0)
})
