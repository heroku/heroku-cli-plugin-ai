import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import Cmd from '../../../../src/commands/ai/models/info.js'
import stripAnsi from '../../../helpers/strip-ansi.js'
import {addon1, addon1Attachment1, mockAPIErrors, modelResource} from '../../../helpers/fixtures.js'

describe('ai:models:info', function () {
  const {env} = process
  let api: nock.Scope
  let herokuAI: nock.Scope

  context('when provisioned model name is provided and is found', function () {
    beforeEach(function () {
      process.env = {}
      api = nock('https://api.heroku.com:443')
      herokuAI = nock('https://us.inference.heroku.com')
    })

    afterEach(function () {
      process.env = env
      nock.cleanAll()
    })

    it('shows info for a model resource', async function () {
      api
        .post('/actions/addons/resolve',
          {addon: addon1.name, app: addon1Attachment1.app?.name})
        .reply(200, [addon1])
        .get(`/addons/${addon1.id}/addon-attachments`)
        .reply(200, [addon1Attachment1])
        .get(`/apps/${addon1Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_KEY: 's3cr3t_k3y',
          INFERENCE_MODEL_ID: 'claude-3-haiku',
          INFERENCE_URL: 'us.inference.heroku.com',
        })
      herokuAI
        .get(`/models/${addon1.id}`)
        .reply(200, modelResource)

      const {stdout, stderr} = await runCommand(Cmd, [
        'inference-regular-74659',
        '--app',
        'app1',
      ])

      expect(stripAnsi(stdout)).to.contain('claude-3-haiku')
      expect(stripAnsi(stdout)).to.contain('latency 0.4sec, 28 tokens/sec')
      expect(stripAnsi(stdout)).to.contain('INFERENCE')
      expect(stripAnsi(stdout)).to.contain('Yes')
      expect(stderr).to.eq('')
    })
  })

  context('when provisioned model name is not provided', function () {
    const multipleAddons = Array.from({length: 2}).fill(addon1)

    beforeEach(function () {
      process.env = {}
      api = nock('https://api.heroku.com:443')
    })

    afterEach(function () {
      process.env = env
      nock.cleanAll()
    })

    it('shows info for all model resources on specified app', async function () {
      api
        .post('/actions/addons/resolve',
          {addon: addon1.name, app: addon1Attachment1.app?.name})
        .reply(200, [addon1])
        .get(`/addons/${addon1.id}/addon-attachments`)
        .reply(200, [addon1Attachment1])
        .get(`/apps/${addon1Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_KEY: 's3cr3t_k3y',
          INFERENCE_MODEL_ID: 'claude-3-haiku',
          INFERENCE_URL: 'us.inference.heroku.com',
        })
      herokuAI = nock('https://us.inference.heroku.com')
        .get(`/models/${addon1.id}`)
        .reply(200, modelResource)
      api
        .get(`/apps/${addon1.app?.name}/addons`)
        .reply(200, multipleAddons)
        .post('/actions/addons/resolve',
          {addon: addon1.name, app: addon1Attachment1.app?.name})
        .reply(200, [addon1])
        .get(`/addons/${addon1.id}/addon-attachments`)
        .reply(200, [addon1Attachment1])
        .get(`/apps/${addon1Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_KEY: 's3cr3t_k3y',
          INFERENCE_MODEL_ID: 'claude-3-haiku',
          INFERENCE_URL: 'us.inference.heroku.com',
        })
      herokuAI
        .get(`/models/${addon1.id}`)
        .reply(200, modelResource)

      const {stdout} = await runCommand(Cmd, [
        '--app',
        'app1',
      ])

      expect(stripAnsi(stdout)).to.contain('claude-3-haiku')
      expect(stripAnsi(stdout)).to.contain('latency 0.4sec, 28 tokens/sec')
      expect(stripAnsi(stdout)).to.contain('INFERENCE')
    })
  })

  context('when provisioned model name is incorrectly inputted', function () {
    const incorrectModelName = 'inference-regular-WRONG'

    beforeEach(function () {
      process.env = {}
      api = nock('https://api.heroku.com:443')
    })

    afterEach(function () {
      process.env = env
      nock.cleanAll()
    })

    it('shows an error message', async function () {
      api
        .post('/actions/addons/resolve',
          {addon: incorrectModelName, app: addon1Attachment1.app?.name})
        .reply(404, mockAPIErrors.modelsInfoErrorResponse)

      const {error} = await runCommand(Cmd, [
        incorrectModelName,
        '--app',
        'app1',
      ])

      expect(stripAnsi(error?.message || '')).to.contain(mockAPIErrors.modelsInfoErrorResponse.message)
    })
  })

  context('when app does not exist', function () {
    beforeEach(function () {
      process.env = {}
      api = nock('https://api.heroku.com:443')
    })

    afterEach(function () {
      process.env = env
      nock.cleanAll()
    })

    it('shows clean error message without addon context', async function () {
      api
        .get('/apps/nonexistent-app/addons')
        .reply(404, {
          id: 'not_found',
          message: 'Couldn\'t find that app.',
        })

      const {error} = await runCommand(Cmd, [
        '--app',
        'nonexistent-app',
      ])

      expect(stripAnsi(error?.message || '')).to.contain('Couldn\'t find that app.')
    })
  })
})
