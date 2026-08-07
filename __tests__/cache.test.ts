import * as cache from '../src/cache.js'

test('isFeatureAvailable returns true if the runner verification token is set', () => {
  try {
    process.env['WARPBUILD_RUNNER_VERIFICATION_TOKEN'] = 'token'
    expect(cache.isFeatureAvailable()).toBe(true)
  } finally {
    delete process.env['WARPBUILD_RUNNER_VERIFICATION_TOKEN']
  }
})

test('isFeatureAvailable returns false if the runner verification token is not set', () => {
  expect(cache.isFeatureAvailable()).toBe(false)
})
