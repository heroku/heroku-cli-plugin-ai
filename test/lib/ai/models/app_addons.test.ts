import {expect} from 'chai'
import nock from 'nock'
import appAddons from '../../../../src/lib/ai/models/app_addons'
import {Config} from '@oclif/core'
import {addon1, addon2} from '../../../helpers/fixtures'

describe('app_addons', function () {
  const {env} = process
  let api: nock.Scope
  let config: Config

  beforeEach(function () {
    process.env = {}
    api = nock('https://api.heroku.com:443')
    config = {} as Config // Mock config
  })

  afterEach(function () {
    process.env = env
    nock.cleanAll()
  })

  context('when the API call succeeds', function () {
    it('returns the addons response', async function () {
      const mockAddons = [addon1, addon2]

      api
        .get('/apps/test-app/addons')
        .query({})
        .reply(200, mockAddons)

      const result = await appAddons(config, 'test-app')
      expect(result).to.deep.equal(mockAddons)
    })

    it('returns empty array when no addons exist', async function () {
      api
        .get('/apps/empty-app/addons')
        .query({})
        .reply(200, [])

      const result = await appAddons(config, 'empty-app')
      expect(result).to.deep.equal([])
    })
  })

  context('when the app is not found', function () {
    it('throws an error with the correct message', async function () {
      api
        .get('/apps/nonexistent-app/addons')
        .query({})
        .reply(404, {
          id: 'not_found',
          message: 'Couldn\'t find that app.',
        })

      try {
        await appAddons(config, 'nonexistent-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('Unable to retrieve add-ons: Couldn\'t find that app.')
      }
    })

    it('throws an error with the correct message for different 404 responses', async function () {
      api
        .get('/apps/another-fake-app/addons')
        .query({})
        .reply(404, {
          id: 'not_found',
          message: 'App not found in this region.',
        })

      try {
        await appAddons(config, 'another-fake-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('Unable to retrieve add-ons: App not found in this region.')
      }
    })
  })

  context('when the API returns an error without a message', function () {
    it('throws an error with a fallback message', async function () {
      api
        .get('/apps/test-app/addons')
        .query({})
        .reply(500, {})

      try {
        await appAddons(config, 'test-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.include('Unable to retrieve add-ons:')
        expect(error.message).to.include('500')
      }
    })

    it('throws an error with a fallback message for network errors', async function () {
      api
        .get('/apps/test-app/addons')
        .query({})
        .replyWithError('Network timeout')

      try {
        await appAddons(config, 'test-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.include('Unable to retrieve add-ons:')
        expect(error.message).to.include('Network timeout')
      }
    })
  })

  context('when the API returns other error status codes', function () {
    it('throws an error with the correct message for 403 forbidden', async function () {
      api
        .get('/apps/restricted-app/addons')
        .query({})
        .reply(403, {
          id: 'forbidden',
          message: 'You do not have access to this app.',
        })

      try {
        await appAddons(config, 'restricted-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('Unable to retrieve add-ons: You do not have access to this app.')
      }
    })

    it('throws an error with the correct message for 422 validation error', async function () {
      api
        .get('/apps/invalid-app/addons')
        .query({})
        .reply(422, {
          id: 'validation_failed',
          message: 'Invalid app name format.',
        })

      try {
        await appAddons(config, 'invalid-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('Unable to retrieve add-ons: Invalid app name format.')
      }
    })
  })

  context('when the API returns malformed error responses', function () {
    it('handles error with empty body gracefully', async function () {
      api
        .get('/apps/test-app/addons')
        .query({})
        .reply(500, {})

      try {
        await appAddons(config, 'test-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.include('Unable to retrieve add-ons:')
      }
    })

    it('handles error with undefined body gracefully', async function () {
      api
        .get('/apps/test-app/addons')
        .query({})
        .reply(500)

      try {
        await appAddons(config, 'test-app')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.include('Unable to retrieve add-ons:')
      }
    })
  })

  context('API request details', function () {
    it('makes request with correct headers', async function () {
      const mockAddons = [addon1]

      api
        .get('/apps/test-app/addons')
        .query({})
        .matchHeader('Accept-Expansion', 'plan')
        .reply(200, mockAddons)

      await appAddons(config, 'test-app')
      // The test will fail if the header doesn't match
    })

    it('uses the correct URL structure', async function () {
      const mockAddons = [addon1]

      api
        .get('/apps/specific-app-name/addons')
        .query({})
        .reply(200, mockAddons)

      const result = await appAddons(config, 'specific-app-name')
      expect(result).to.deep.equal(mockAddons)
    })
  })
})
