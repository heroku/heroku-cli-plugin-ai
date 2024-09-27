import {expect} from 'chai'
import {stdout, stderr} from 'stdout-stderr'
import Cmd from '../../../../src/commands/ai/models/info'
import {runCommand} from '../../../run-command'
import {modelResource, addon1Attachment1, addon1} from '../../../helpers/fixtures'
import nock from 'nock'
import heredoc from 'tsheredoc'
import stripAnsi from '../../../helpers/strip-ansi'

describe.only('ai:models:info', function () {
  const {env} = process
  let api: nock.Scope

  context('when provisioned model name is provided and is found', function () {
    beforeEach(function () {
      process.env = {}
      api = nock('https://api.heroku.com:443')
    })

    afterEach(function () {
      process.env = env
      nock.cleanAll()
    })

    it('shows info for a model instance ', async function () {
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
          INFERENCE_URL: 'inference.heroku.com',
        })
      nock('https://inference.heroku.com')
        .get(`/models/${addon1Attachment1.id}`)
        .reply(200, modelResource)

      await runCommand(Cmd, [
        '--app',
        'app1',
        'inference-regular-74659',
      ], true)

      expect(stdout.output).to.eq(heredoc`
        Avg Performance: latency 0.4sec, 28 tokens/sec
        Base Model ID:   claude-3-haiku
        Ready:           Yes
        Tokens In:       0 tokens this period
        Tokens Out:      0 tokens this period
        `)
    })
  })

  context('when provisioned model name is not provided', function () {
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
          INFERENCE_URL: 'inference.heroku.com',
        })
      nock('https://inference.heroku.com')
        .get(`/models/${addon1Attachment1.id}`)
        .reply(200, modelResource)

      await runCommand(Cmd, [
        '--app',
        'app1',
        'inference-regular-74659',
      ], true)

      expect(stdout.output).to.eq(heredoc`
        Avg Performance: latency 0.4sec, 28 tokens/sec
        Base Model ID:   claude-3-haiku
        Ready:           Yes
        Tokens In:       0 tokens this period
        Tokens Out:      0 tokens this period
        `)
    })
  })

  context('when provisioned model name is incorrectly inputted', function () {
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
          {addon: addon1.name, app: addon1Attachment1.app?.name})
        .reply(200, [addon1])
        .get(`/addons/${addon1.id}/addon-attachments`)
        .reply(200, [addon1Attachment1])
        .get(`/apps/${addon1Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_KEY: 's3cr3t_k3y',
          INFERENCE_MODEL_ID: 'claude-3-haiku',
          INFERENCE_URL: 'inference.heroku.com',
        })
      nock('https://inference.heroku.com')
        .get(`/models/${addon1Attachment1.id}`)
        .reply(404, {error: 'Model not found'})

      await runCommand(Cmd, [
        '--app',
        'app1',
        'inference-regular-74659',
      ])
      expect(stripAnsi(stderr.output)).to.eq(' Warning: inference-regular-74659 is not yet provisioned.\n Run heroku ai:wait to wait until the instance is provisioned.\n')
    })
  })
})
