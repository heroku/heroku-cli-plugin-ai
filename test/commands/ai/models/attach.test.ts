import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors'
import {stdout, stderr} from 'stdout-stderr'
import {expect} from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import heredoc from 'tsheredoc'
import Cmd from '../../../../src/commands/ai/models/attach'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {addon3, addon3Attachment1, addon3Attachment2} from '../../../helpers/fixtures'

describe('ai:models:attach', function () {
  const {env} = process
  let api: nock.Scope
  let sandbox: sinon.SinonSandbox

  beforeEach(async function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: 'app1'})
      .reply(200, [addon3Attachment1])
      .get(`/apps/${addon3.app?.id}/addons/${addon3.id}`)
      .reply(200, addon3)
      .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
      .reply(200, {
        INFERENCE_MAROON_KEY: 's3cr3t_k3y',
        INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
        INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
      })
  })

  afterEach(function () {
    process.env = env
    api.done()
    nock.cleanAll()
    sandbox.restore()
  })

  context('when attaching a model resource with a default name', function () {
    it('attaches the model resource with a default name', async function () {
      api
        .post('/addon-attachments', {app: {name: 'app2'}, addon: {name: 'inference-animate-91825'}})
        .reply(201, addon3Attachment2)
        .get('/apps/app2/releases')
        .reply(200, [{version: 10}])

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--target-app=app2',
        '--source-app=app1',
      ])

      expect(stdout.output).to.eq('')
      expect(stripAnsi(stderr.output)).to.eq(heredoc`
        Attaching inference-animate-91825 to app2...
        Attaching inference-animate-91825 to app2... done
        Setting INFERENCE_JADE config vars and restarting app2...
        Setting INFERENCE_JADE config vars and restarting app2... done, v10
      `)
    })
  })

  context('when attaching a model resource with an alias name', function () {
    it('attaches the model resource with the specified name', async function () {
      api = nock('https://api.heroku.com')
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          name: 'CLAUDE_SONNET',
        })
        .reply(201, {
          ...addon3Attachment2,
          name: 'CLAUDE_SONNET',
        })
        .get('/apps/app2/releases')
        .reply(200, [{version: 10}])

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--target-app=app2',
        '--source-app=app1',
        '--as=CLAUDE_SONNET',
      ])

      expect(stdout.output).to.eq('')
      expect(stripAnsi(stderr.output)).to.eq(heredoc`
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2...
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2... done
        Setting CLAUDE_SONNET config vars and restarting app2...
        Setting CLAUDE_SONNET config vars and restarting app2... done, v10
      `)
    })
  })

  context('when attaching a model resource with an existing alias name', function () {
    it("requires interactive confirmation if the user didn't use the --confirm option", async function () {
      const prompt = sandbox.stub(ux, 'prompt').resolves('app2')
      api
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          name: 'CLAUDE_SONNET',
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_SONNET to app app2 would overwrite existing vars CLAUDE_SONNET_KEY, CLAUDE_SONNET_MODEL_ID, and CLAUDE_SONNET_URL.',
        })
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          confirm: 'app2',
          name: 'CLAUDE_SONNET',
        })
        .reply(201, {
          ...addon3Attachment2,
          name: 'CLAUDE_SONNET',
        })
        .get('/apps/app2/releases')
        .reply(200, [{version: 10}])

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--target-app=app2',
        '--source-app=app1',
        '--as=CLAUDE_SONNET',
      ])

      expect(prompt.calledOnce).to.be.true
      expect(stripAnsi(stdout.output)).to.eq('')
      expect(stripAnsi(stderr.output)).to.contain('Adding CLAUDE_SONNET to app app2 would overwrite existing vars')
      expect(stripAnsi(stderr.output)).to.contain(heredoc`
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2...
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2... done
      `)
      expect(stripAnsi(stderr.output)).to.contain(heredoc`
        Setting CLAUDE_SONNET config vars and restarting app2...
        Setting CLAUDE_SONNET config vars and restarting app2... done, v10
      `)
    })

    it("doesn't require interactive confirmation if the user used the correct --confirm option", async function () {
      const prompt = sandbox.stub(ux, 'prompt')
      api
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          confirm: 'app2',
          name: 'CLAUDE_SONNET',
        })
        .reply(201, {
          ...addon3Attachment2,
          name: 'CLAUDE_SONNET',
        })
        .get('/apps/app2/releases')
        .reply(200, [{version: 10}])

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--target-app=app2',
        '--source-app=app1',
        '--as=CLAUDE_SONNET',
        '--confirm=app2',
      ])
      expect(prompt.calledOnce).to.be.false
      expect(stripAnsi(stdout.output)).to.eq('')
      expect(stripAnsi(stderr.output)).not.to.contain('Adding CLAUDE_SONNET to app app2 would overwrite existing vars')
      expect(stripAnsi(stderr.output)).to.contain(heredoc`
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2...
        Attaching inference-animate-91825 as CLAUDE_SONNET to app2... done
      `)
      expect(stripAnsi(stderr.output)).to.contain(heredoc`
        Setting CLAUDE_SONNET config vars and restarting app2...
        Setting CLAUDE_SONNET config vars and restarting app2... done, v10
      `)
    })

    it('fails if the user provides the wrong confirmation response interactively', async function () {
      const prompt = sandbox.stub(ux, 'prompt').resolves('wrong-app-name')
      api
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          name: 'CLAUDE_SONNET',
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_SONNET to app app2 would overwrite existing vars CLAUDE_SONNET_KEY, CLAUDE_SONNET_MODEL_ID, and CLAUDE_SONNET_URL.',
        })

      try {
        await runCommand(Cmd, [
          'inference-animate-91825',
          '--target-app=app2',
          '--source-app=app1',
          '--as=CLAUDE_SONNET',
        ])
      } catch (error: unknown) {
        const {message} = error as Error
        expect(stripAnsi(message)).to.eq('Confirmation did not match app2. Aborted.')
      }

      expect(prompt.calledOnce).to.be.true
      expect(stripAnsi(stdout.output)).to.eq('')
      expect(stripAnsi(stderr.output)).to.contain('Adding CLAUDE_SONNET to app app2 would overwrite existing vars')
    })

    it('fails if the user provides the wrong --confirmation option value', async function () {
      const prompt = sandbox.stub(ux, 'prompt')
      api
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          confirm: 'wrong-app-name',
          name: 'CLAUDE_SONNET',
        })
        .reply(423, {
          id: 'confirmation_required',
          message: 'Adding CLAUDE_SONNET to app app2 would overwrite existing vars CLAUDE_SONNET_KEY, CLAUDE_SONNET_MODEL_ID, and CLAUDE_SONNET_URL.',
        })

      try {
        await runCommand(Cmd, [
          'inference-animate-91825',
          '--target-app=app2',
          '--source-app=app1',
          '--as=CLAUDE_SONNET',
          '--confirm=wrong-app-name',
        ])
      } catch (error: unknown) {
        const {message} = error as Error
        expect(stripAnsi(message)).to.eq('Confirmation wrong-app-name did not match app2. Aborted.')
      }

      expect(prompt.calledOnce).to.be.false
      expect(stripAnsi(stdout.output)).to.eq('')
      expect(stripAnsi(stderr.output)).not.to.contain('Adding CLAUDE_SONNET to app app2 would overwrite existing vars')
    })
  })

  context('when using an invalid alias name argument', function () {
    beforeEach(function () {
      const message = 'Name must start with a letter and can only contain uppercase letters, numbers, and underscores.'
      api
        .post('/addon-attachments', {
          app: {name: 'app2'},
          addon: {name: 'inference-animate-91825'},
          name: 'wrong-alias',
        })
        .reply(422, {id: 'invalid_params', message})
    })

    it('errors out, showing the appropriate message', async function () {
      try {
        await runCommand(Cmd, [
          'inference-animate-91825',
          '--target-app=app2',
          '--source-app=app1',
          '--as=wrong-alias',
        ])
      } catch (error: unknown) {
        const {message, oclif} = error as CLIError
        expect(stripAnsi(message)).to.eq('wrong-alias is an invalid alias. Alias must start with a letter and can only contain uppercase letters, numbers, and underscores.')
        expect(oclif.exit).to.eq(1)
      }

      expect(stripAnsi(stdout.output)).to.eq('')
    })
  })
})
