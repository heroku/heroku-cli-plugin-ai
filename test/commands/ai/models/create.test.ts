import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors'
import {expect} from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import {stdout, stderr} from 'stdout-stderr'
import Cmd from '../../../../src/commands/ai/models/create'
import {runCommand} from '../../../run-command'
import stripAnsi from '../../../helpers/strip-ansi'
import {addon1Provisioned, addon1ProvisionedWithAttachmentName} from '../../../helpers/fixtures'
import heredoc from 'tsheredoc'

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
      await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
      ])
      expect(stripAnsi(stderr.output)).to.include(heredoc`
        Creating heroku-inference:claude-3-haiku on app1... metered
      `)
      expect(stripAnsi(stdout.output)).to.eq(heredoc`
        Heroku AI model resource provisioned successfully
        Resource name: inference-regular-74659
        Run 'heroku config -a app1' to view model config vars associated with this app.
        Use heroku ai:docs to view documentation.
      `)
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
      await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
      ])
      expect(stripAnsi(stderr.output)).to.include(heredoc`
        Creating heroku-inference:claude-3-haiku on app1... metered
      `)
      expect(stripAnsi(stdout.output)).to.eq(heredoc`
        Heroku AI model resource provisioned successfully
        Resource name: inference-regular-74659
        Resource alias: CLAUDE_HAIKU
        Run 'heroku config -a app1' to view model config vars associated with this app.
        Use heroku ai:docs to view documentation.
      `)
    })
  })

  context('when reusing an existing attachment name', function () {
    it('requires interactive confirmation if the user didn’t use the --confirm option', async function () {
      const prompt = sandbox.stub(ux, 'prompt').resolves('app1')
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

      await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
      ])
      expect(prompt.calledOnce).to.be.true
      expect(stripAnsi(stderr.output)).to.contain('Adding CLAUDE_HAIKU to app app1 would overwrite existing vars')
      expect(stripAnsi(stdout.output)).to.eq(heredoc`
        Heroku AI model resource provisioned successfully
        Resource name: inference-regular-74659
        Resource alias: CLAUDE_HAIKU
        Run 'heroku config -a app1' to view model config vars associated with this app.
        Use heroku ai:docs to view documentation.
      `)
    })

    it('doesn’t require interactive confirmation if the user used the correct --confirm option', async function () {
      const prompt = sandbox.stub(ux, 'prompt')
      api
        .post('/apps/app1/addons', {
          config: {},
          confirm: 'app1',
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'CLAUDE_HAIKU'},
        })
        .reply(200, addon1ProvisionedWithAttachmentName)

      await runCommand(Cmd, [
        'claude-3-haiku',
        '--app=app1',
        '--as=CLAUDE_HAIKU',
        '--confirm=app1',
      ])
      expect(prompt.calledOnce).to.be.false
      expect(stripAnsi(stderr.output)).not.to.contain('Adding CLAUDE_HAIKU to app app1 would overwrite existing vars')
      expect(stripAnsi(stdout.output)).to.eq(heredoc`
        Heroku AI model resource provisioned successfully
        Resource name: inference-regular-74659
        Resource alias: CLAUDE_HAIKU
        Run 'heroku config -a app1' to view model config vars associated with this app.
        Use heroku ai:docs to view documentation.
      `)
    })

    it('fails if the user provides the wrong confirmation response interactively', async function () {
      const prompt = sandbox.stub(ux, 'prompt').resolves('wrong-app-name')
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

      try {
        await runCommand(Cmd, [
          'claude-3-haiku',
          '--app=app1',
          '--as=CLAUDE_HAIKU',
        ])
      } catch (error: unknown) {
        const {message} = error as Error
        expect(stripAnsi(message)).to.eq('Confirmation did not match app1. Aborted.')
      }

      expect(prompt.calledOnce).to.be.true
      expect(stripAnsi(stderr.output)).to.contain('Adding CLAUDE_HAIKU to app app1 would overwrite existing vars')
      expect(stripAnsi(stdout.output)).to.eq('')
    })

    it('fails if the user provides the wrong --confirmation option value', async function () {
      const prompt = sandbox.stub(ux, 'prompt')
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

      try {
        await runCommand(Cmd, [
          'claude-3-haiku',
          '--app=app1',
          '--as=CLAUDE_HAIKU',
          '--confirm=wrong-app-name',
        ])
      } catch (error: unknown) {
        const {message} = error as Error
        expect(stripAnsi(message)).to.eq('Confirmation wrong-app-name did not match app1. Aborted.')
      }

      expect(prompt.calledOnce).to.be.false
      expect(stripAnsi(stderr.output)).not.to.contain('Adding CLAUDE_HAIKU to app app1 would overwrite existing vars')
      expect(stripAnsi(stdout.output)).to.eq('')
    })
  })

  context('when using an invalid model name argument', function () {
    beforeEach(function () {
      const message = 'Couldn\'t find either the add-on service or the add-on plan of "heroku-inference:not-a-model-name".'
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:not-a-model-name'},
          attachment: {},
        })
        .reply(422, {id: 'invalid_params', message})
    })

    it('errors out, showing the appropriate message', async function () {
      try {
        await runCommand(Cmd, [
          'not-a-model-name',
          '--app=app1',
        ])
      } catch (error: unknown) {
        const {message, oclif} = error as CLIError
        expect(stripAnsi(message)).to.eq(
          'not-a-model-name is an invalid model name. Run heroku ai:models:list for a list of valid models per region.'
        )
        expect(oclif.exit).to.eq(1)
      }

      expect(stripAnsi(stdout.output)).to.eq('')
    })
  })

  context('when using an invalid alias name argument', function () {
    beforeEach(function () {
      const message = 'Name must start with a letter and can only contain uppercase letters, numbers, and underscores.'
      api
        .post('/apps/app1/addons', {
          config: {},
          plan: {name: 'heroku-inference:claude-3-haiku'},
          attachment: {name: 'wrong-alias'},
        })
        .reply(422, {id: 'invalid_params', message})
    })

    it('errors out, showing the appropriate message', async function () {
      try {
        await runCommand(Cmd, [
          'claude-3-haiku',
          '--app=app1',
          '--as=wrong-alias',
        ])
      } catch (error: unknown) {
        const {message, oclif} = error as CLIError
        expect(stripAnsi(message)).to.eq(
          'wrong-alias is an invalid alias name. It must start with a letter and can only contain uppercase letters, numbers, and underscores.'
        )
        expect(oclif.exit).to.eq(1)
      }

      expect(stripAnsi(stdout.output)).to.eq('')
    })
  })
})
