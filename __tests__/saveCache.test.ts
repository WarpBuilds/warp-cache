import * as core from '@actions/core'
import * as path from 'path'
import {saveCache} from '../src/cache.js'
import * as cacheHttpClient from '../src/internal/cacheHttpClient.js'
import * as cacheUtils from '../src/internal/cacheUtils.js'
import {CacheFilename, CompressionMethod} from '../src/internal/constants.js'
import * as tar from '../src/internal/tar.js'
import {TypedResponse} from '@actions/http-client/lib/interfaces'
import {ITypedResponseWithError} from '../src/internal/contracts.js'
import {CommonsReserveCacheResponse} from '../src/internal/warpcache-ts-sdk/index.js'
import {HttpClientError} from '@actions/http-client'

jest.mock('../src/internal/cacheHttpClient')
jest.mock('../src/internal/cacheUtils')
jest.mock('../src/internal/tar')

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(core, 'debug').mockImplementation(() => {})
  jest.spyOn(core, 'info').mockImplementation(() => {})
  jest.spyOn(core, 'warning').mockImplementation(() => {})
  jest.spyOn(core, 'error').mockImplementation(() => {})
  jest.spyOn(cacheUtils, 'getCacheFileName').mockImplementation(cm => {
    const actualUtils = jest.requireActual('../src/internal/cacheUtils')
    return actualUtils.getCacheFileName(cm)
  })
  jest.spyOn(cacheUtils, 'resolvePaths').mockImplementation(async filePaths => {
    return filePaths.map(x => path.resolve(x))
  })
  jest.spyOn(cacheUtils, 'createTempDirectory').mockImplementation(async () => {
    return Promise.resolve('/foo/bar')
  })
  jest
    .spyOn(cacheHttpClient, 'getCacheVersion')
    .mockReturnValue('cache-version')
})

test('save with missing input should fail', async () => {
  const paths: string[] = []
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  await expect(saveCache(paths, primaryKey)).rejects.toThrowError(
    `Path Validation Error: At least one directory or file path is required`
  )
})

test('save with large cache outputs should fail', async () => {
  const filePath = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const cachePaths = [path.resolve(filePath)]

  const createTarMock = jest.spyOn(tar, 'createTar')
  const logWarningMock = jest.spyOn(core, 'warning')

  const cacheSize = 11 * 1024 * 1024 * 1024 //~11GB
  jest
    .spyOn(cacheUtils, 'getArchiveFileSizeInBytes')
    .mockReturnValueOnce(cacheSize)
  const compression = CompressionMethod.Gzip
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValueOnce(Promise.resolve(compression))

  const cacheId = await saveCache([filePath], primaryKey)
  expect(cacheId).toBe(-1)
  expect(logWarningMock).toHaveBeenCalledTimes(1)
  expect(logWarningMock).toHaveBeenCalledWith(
    'Failed to save: Cache size of ~11264 MB (11811160064 B) is over the data cap limit, not saving cache.'
  )

  const archiveFolder = '/foo/bar'

  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledWith(
    archiveFolder,
    cachePaths,
    compression
  )
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with large cache outputs should fail in GHES with error message', async () => {
  const filePath = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const cachePaths = [path.resolve(filePath)]

  const createTarMock = jest.spyOn(tar, 'createTar')
  const logWarningMock = jest.spyOn(core, 'warning')

  const cacheSize = 11 * 1024 * 1024 * 1024 //~11GB, over the 10GB limit
  jest
    .spyOn(cacheUtils, 'getArchiveFileSizeInBytes')
    .mockReturnValueOnce(cacheSize)
  const compression = CompressionMethod.Gzip
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValueOnce(Promise.resolve(compression))

  jest.spyOn(cacheUtils, 'isGhes').mockReturnValueOnce(true)

  const reserveCacheMock = jest
    .spyOn(cacheHttpClient, 'reserveCache')
    .mockImplementation(async () => {
      const response: ITypedResponseWithError<CommonsReserveCacheResponse> = {
        statusCode: 400,
        result: null,
        headers: {},
        error: new HttpClientError(
          'The cache filesize must be between 0 and 1073741824 bytes',
          400
        )
      }
      return response
    })

  const cacheId = await saveCache([filePath], primaryKey)
  expect(cacheId).toBe(-1)
  expect(logWarningMock).toHaveBeenCalledTimes(1)
  expect(logWarningMock).toHaveBeenCalledWith(
    'Failed to save: The cache filesize must be between 0 and 1073741824 bytes'
  )

  const archiveFolder = '/foo/bar'
  expect(reserveCacheMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledWith(
    archiveFolder,
    cachePaths,
    compression
  )
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with large cache outputs should fail in GHES without error message', async () => {
  const filePath = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const cachePaths = [path.resolve(filePath)]

  const createTarMock = jest.spyOn(tar, 'createTar')
  const logWarningMock = jest.spyOn(core, 'warning')

  const cacheSize = 11 * 1024 * 1024 * 1024 //~11GB, over the 10GB limit
  jest
    .spyOn(cacheUtils, 'getArchiveFileSizeInBytes')
    .mockReturnValueOnce(cacheSize)
  const compression = CompressionMethod.Gzip
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValueOnce(Promise.resolve(compression))

  jest.spyOn(cacheUtils, 'isGhes').mockReturnValueOnce(true)

  const reserveCacheMock = jest
    .spyOn(cacheHttpClient, 'reserveCache')
    .mockImplementation(async () => {
      const response: ITypedResponseWithError<CommonsReserveCacheResponse> = {
        statusCode: 400,
        result: null,
        headers: {}
      }
      return response
    })

  const cacheId = await saveCache([filePath], primaryKey)
  expect(cacheId).toBe(-1)
  expect(logWarningMock).toHaveBeenCalledTimes(1)
  expect(logWarningMock).toHaveBeenCalledWith(
    'Failed to save: Cache size of ~11264 MB (11811160064 B) is over the data cap limit, not saving cache.'
  )

  const archiveFolder = '/foo/bar'
  expect(reserveCacheMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledWith(
    archiveFolder,
    cachePaths,
    compression
  )
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with reserve cache failure should fail', async () => {
  const paths = ['node_modules']
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const logInfoMock = jest.spyOn(core, 'info')
  const reserveError = 'Unable to reserve cache'

  const reserveCacheMock = jest
    .spyOn(cacheHttpClient, 'reserveCache')
    .mockImplementation(async () => {
      const response: ITypedResponseWithError<CommonsReserveCacheResponse> = {
        statusCode: 500,
        result: null,
        headers: {},
        error: new HttpClientError(reserveError, 500)
      }
      return response
    })

  const createTarMock = jest.spyOn(tar, 'createTar')
  const saveCacheMock = jest.spyOn(cacheHttpClient, 'saveCache')
  const compression = CompressionMethod.Zstd
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValueOnce(Promise.resolve(compression))

  const cacheId = await saveCache(paths, primaryKey)
  expect(cacheId).toBe(-1)
  expect(logInfoMock).toHaveBeenCalledTimes(1)
  expect(logInfoMock).toHaveBeenCalledWith(`Failed to save: ${reserveError}`)

  expect(reserveCacheMock).toHaveBeenCalledTimes(1)
  expect(reserveCacheMock).toHaveBeenCalledWith(
    primaryKey,
    expect.any(Number),
    expect.any(String)
  )
  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(saveCacheMock).toHaveBeenCalledTimes(0)
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with server error should fail', async () => {
  const filePath = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const cachePaths = [path.resolve(filePath)]
  const logWarningMock = jest.spyOn(core, 'warning')
  const reserveCacheMock = jest
    .spyOn(cacheHttpClient, 'reserveCache')
    .mockImplementation(async () => {
      const response: TypedResponse<CommonsReserveCacheResponse> = {
        statusCode: 200,
        result: {provider: 's3'},
        headers: {}
      }
      return response
    })

  jest.spyOn(cacheUtils, 'getArchiveFileSizeInBytes').mockReturnValue(1024)

  const createTarMock = jest.spyOn(tar, 'createTar')

  const saveCacheMock = jest
    .spyOn(cacheHttpClient, 'saveCache')
    .mockImplementationOnce(() => {
      throw new Error('HTTP Error Occurred')
    })
  const compression = CompressionMethod.Zstd
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValueOnce(Promise.resolve(compression))

  await saveCache([filePath], primaryKey)
  expect(logWarningMock).toHaveBeenCalledTimes(1)
  expect(logWarningMock).toHaveBeenCalledWith(
    'Failed to save: HTTP Error Occurred'
  )

  expect(reserveCacheMock).toHaveBeenCalledTimes(1)
  expect(reserveCacheMock).toHaveBeenCalledWith(
    primaryKey,
    expect.any(Number),
    expect.any(String)
  )
  const archiveFolder = '/foo/bar'
  const archiveFile = path.join(archiveFolder, CacheFilename.Zstd)
  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledWith(
    archiveFolder,
    cachePaths,
    compression
  )
  expect(saveCacheMock).toHaveBeenCalledTimes(1)
  expect(saveCacheMock).toHaveBeenCalledWith(
    's3',
    primaryKey,
    expect.any(String),
    archiveFile,
    '',
    '',
    expect.any(Number),
    []
  )
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with valid inputs uploads a cache', async () => {
  const filePath = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  const cachePaths = [path.resolve(filePath)]

  const uploadId = 'upload-id'
  const uploadKey = 'upload-key'
  const preSignedUrls = ['https://s3.test/part-1']
  const reserveCacheMock = jest
    .spyOn(cacheHttpClient, 'reserveCache')
    .mockImplementation(async () => {
      const response: TypedResponse<CommonsReserveCacheResponse> = {
        statusCode: 200,
        result: {
          provider: 's3',
          s3: {
            upload_id: uploadId,
            upload_key: uploadKey,
            pre_signed_urls: preSignedUrls
          }
        },
        headers: {}
      }
      return response
    })

  jest.spyOn(cacheUtils, 'getArchiveFileSizeInBytes').mockReturnValue(1024)

  const createTarMock = jest.spyOn(tar, 'createTar')

  const saveCacheMock = jest.spyOn(cacheHttpClient, 'saveCache')
  const compression = CompressionMethod.Zstd
  const getCompressionMock = jest
    .spyOn(cacheUtils, 'getCompressionMethod')
    .mockReturnValue(Promise.resolve(compression))

  await saveCache([filePath], primaryKey)

  expect(reserveCacheMock).toHaveBeenCalledTimes(1)
  expect(reserveCacheMock).toHaveBeenCalledWith(
    primaryKey,
    expect.any(Number),
    expect.any(String)
  )
  const archiveFolder = '/foo/bar'
  const archiveFile = path.join(archiveFolder, CacheFilename.Zstd)
  expect(createTarMock).toHaveBeenCalledTimes(1)
  expect(createTarMock).toHaveBeenCalledWith(
    archiveFolder,
    cachePaths,
    compression
  )
  expect(saveCacheMock).toHaveBeenCalledTimes(1)
  expect(saveCacheMock).toHaveBeenCalledWith(
    's3',
    primaryKey,
    expect.any(String),
    archiveFile,
    uploadId,
    uploadKey,
    expect.any(Number),
    preSignedUrls
  )
  expect(getCompressionMock).toHaveBeenCalledTimes(1)
})

test('save with non existing path should not save cache', async () => {
  const path = 'node_modules'
  const primaryKey = 'Linux-node-bb828da54c148048dd17899ba9fda624811cfb43'
  jest.spyOn(cacheUtils, 'resolvePaths').mockImplementation(async () => {
    return []
  })
  await expect(saveCache([path], primaryKey)).rejects.toThrowError(
    `Path Validation Error: Path(s) specified in the action for caching do(es) not exist, hence no cache is being saved.`
  )
})
