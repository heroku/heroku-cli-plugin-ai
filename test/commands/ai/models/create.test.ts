import {runCommand} from '@heroku-cli/test-utils'
import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import Cmd from '../../../../src/commands/ai/models/create.js'
import stripAnsi from '../../../helpers/strip-ansi.js'
import {addon1Provisioned, addon1ProvisionedWithAttachmentName} from '../../../helpers/fixtures.js'

describe('ai:models:create', function () {
  const {env} = process
  let api: nock.Scope
  let sandbox: sinon.SinonSandbox

  beforeEach(async function () {
    process.env = {}
    api = nock('https://api.heroku.com:443')
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    process.env = env
    api.done()
    nock.cleanAll()
    sandbox.restore()
  })

  context('when creating a model resource with just the model name argument', function () {
    beforeEach(function () {
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {},
        })
        .reply(200, addon1Provisioned)
    })

    it('creates the model resource showing the appropriate output', async function () {
      const {stdout, stderr} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
      ])
      expect(stripAnsi(stderr)).to.contain('metered')
      expect(stripAnsi(stdout)).to.contain('Heroku AI model resource provisioned successfully')
      expect(stripAnsi(stdout)).to.contain('Resource name: inference-regular-74659')
      expect(stripAnsi(stdout)).to.contain('heroku ai:docs')
    })
  })

  context('when using the --as=<value> option', function () {
    beforeEach(function () {
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(200, addon1ProvisionedWithAttachmentName)
    })

    it('creates the model resource passing the specified attachment name', async function () {
      const {stdout, stderr} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
      ])
      expect(stripAnsi(stderr)).to.contain('metered')
      expect(stripAnsi(stdout)).to.contain('Resource name: inference-regular-74659')
      expect(stripAnsi(stdout)).to.contain('Resource alias: CLAUDE_HAIKU')
    })
  })

  context('when reusing an existing attachment name', function () {
    it("requires interactive confirmation if the user didn't use the --confirm option", async function () {
      const confirmCommand = sandbox.stub(hux, 'confirmCommand').resolves()
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_HAIKU to app app1 would overwrite existing vars CLAUDE_HAIKU_KEY, CLAUDE_HAIKU_MODEL_ID, and CLAUDE_HAIKU_URL.',
        })
        .post('/apps/app1/addons', {
          config: {},
          confirm: 'app1',
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(200, addon1ProvisionedWithAttachmentName)

      const {stdout} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
      ])
      expect(confirmCommand.calledOnce).to.be.true
      expect(stripAnsi(stdout)).to.contain('Resource name: inference-regular-74659')
      expect(stripAnsi(stdout)).to.contain('Resource alias: CLAUDE_HAIKU')
    })

    it("doesn't require interactive confirmation if the user used the correct --confirm option", async function () {
      const confirmCommand = sandbox.stub(hux, 'confirmCommand').resolves()
      api
        .post('/apps/app1/addons', {
          config: {},
          confirm: 'app1',
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(200, addon1ProvisionedWithAttachmentName)

      const {stdout, stderr} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
        '--confirm=app1',
      ])
      expect(confirmCommand.calledOnce).to.be.false
      expect(stripAnsi(stderr)).not.to.contain('Adding CLAUDE_HAIKU to app app1 would overwrite existing vars')
      expect(stripAnsi(stdout)).to.contain('Resource name: inference-regular-74659')
      expect(stripAnsi(stdout)).to.contain('Resource alias: CLAUDE_HAIKU')
    })

    it('fails if the user provides the wrong confirmation response interactively', async function () {
      const confirmCommand = sandbox.stub(hux, 'confirmCommand')
        .rejects(new Error('Confirmation did not match app1. Aborted.'))
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_HAIKU to app app1 would overwrite existing vars CLAUDE_HAIKU_KEY, CLAUDE_HAIKU_MODEL_ID, and CLAUDE_HAIKU_URL.',
        })

      const {error, stdout} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
      ])

      expect(confirmCommand.calledOnce).to.be.true
      expect(stripAnsi(error?.message || '')).to.contain('Confirmation did not match app1. Aborted.')
      expect(stripAnsi(stdout)).to.eq('')
    })

    it('fails if the user provides the wrong --confirmation option value', async function () {
      const confirmCommand = sandbox.stub(hux, 'confirmCommand')
        .rejects(new Error('Confirmation wrong-app-name did not match app1. Aborted.'))
      api
        .post('/apps/app1/addons', {
          config: {},
          confirm: 'wrong-app-name',
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_HAIKU to app app1 would overwrite existing vars CLAUDE_HAIKU_KEY, CLAUDE_HAIKU_MODEL_ID, and CLAUDE_HAIKU_URL.',
        })

      const {error, stdout} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
        '--confirm=wrong-app-name',
      ])

      expect(confirmCommand.calledOnce).to.be.true
      expect(stripAnsi(error?.message || '')).to.contain('Confirmation wrong-app-name did not match app1. Aborted.')
      expect(stripAnsi(stdout)).to.eq('')
    })
  })

  context('when using an invalid model name argument', function () {
    beforeEach(function () {
      const message = 'not-a-model-name is an invalid model name. Run heroku ai:models:list for a list of valid models per region.'
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:not-a-model-name'},
          attachment: {},
        })
        .reply(422, {id: 'invalid_params', message})
    })

    it('errors out, showing the appropriate message', async function () {
      const {error, stdout} = await runCommand(Cmd, [
        'not-a-model-name',
        '--app=app1',
      ])

      expect(stripAnsi(error?.message || '')).to.contain('not-a-model-name is an invalid model name. Run heroku ai:models:list for a list of valid models per region.')
      expect(stripAnsi(stdout)).to.eq('')
    })
  })

  context('when using an invalid alias name argument', function () {
    beforeEach(function () {
      const message = 'wrong-alias is an invalid alias. Alias must start with a letter and can only contain uppercase letters, numbers, and underscores.'
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'wrong-alias'},
        })
        .reply(422, {id: 'invalid_params', message})
    })

    it('errors out, showing the appropriate message', async function () {
      const {error, stdout} = await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=wrong-alias',
      ])

      expect(stripAnsi(error?.message || '')).to.contain('wrong-alias is an invalid alias. Alias must start with a letter and can only contain uppercase letters, numbers, and underscores.')
      expect(stripAnsi(stdout)).to.eq('')
    })
  })
})
