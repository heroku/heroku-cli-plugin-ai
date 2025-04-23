import {expect} from 'chai'
import {stdout, stderr} from 'stdout-stderr'
import Cmd from '../../../../src/commands/ai/models/info'
import {runCommand} from '../../../run-command'
import {modelResource, addon1Attachment1, addon1, mockAPIErrors} from '../../../helpers/fixtures'
import nock from 'nock'
import heredoc from 'tsheredoc'
import stripAnsi from '../../../helpers/strip-ansi'
import {CLIError} from '@oclif/core/lib/errors'

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
        .get('/models/claude-3-haiku')
        .reply(200, modelResource)

      await runCommand(Cmd, [
        'inference-regular-74659',
        '--app',
        'app1',
      ])

      expect(stripAnsi(stdout.output)).to.equal(heredoc`

        === claude-3-haiku

        Avg Performance:   latency 0.4sec, 28 tokens/sec
        Base Model ID:     claude-3-haiku
        Model Alias:       INFERENCE
        Model Resource ID: a5e060e7-be73-4129-a197-c4b9dc8debfd
        Ready:             Yes
        Tokens In:         0 tokens this period
        Tokens Out:        0 tokens this period
        `)

      expect(stderr.output).to.eq('')
    })
  })

  context('when provisioned model name is not provided', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
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
      herokuAI
        .get('/models/claude-3-haiku')
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
        .get('/models/claude-3-haiku')
        .reply(200, modelResource)

      await runCommand(Cmd, [
        '--app',
        'app1',
      ])

      expect(stdout.output).to.equal(heredoc`

        === claude-3-haiku
        
        Avg Performance:   latency 0.4sec, 28 tokens/sec
        Base Model ID:     claude-3-haiku
        Model Alias:       INFERENCE
        Model Resource ID: a5e060e7-be73-4129-a197-c4b9dc8debfd
        Ready:             Yes
        Tokens In:         0 tokens this period
        Tokens Out:        0 tokens this period

        === claude-3-haiku

        Avg Performance:   latency 0.4sec, 28 tokens/sec
        Base Model ID:     claude-3-haiku
        Model Alias:       INFERENCE
        Model Resource ID: a5e060e7-be73-4129-a197-c4b9dc8debfd
        Ready:             Yes
        Tokens In:         0 tokens this period
        Tokens Out:        0 tokens this period
        `)
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

      try {
        await runCommand(Cmd, [
          incorrectModelName,
          '--app',
          'app1',
        ])
      } catch (error) {
        const {message} = error as CLIError
        expect(stripAnsi(message)).contains(mockAPIErrors.modelsInfoErrorResponse.message)
      }
    })
  })
})
