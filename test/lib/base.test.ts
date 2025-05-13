import {Args} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors'
import {expect} from '@oclif/test'
import nock from 'nock'
import heredoc from 'tsheredoc'
import {stderr, stdout} from 'stdout-stderr'
import {runCommand} from '../run-command'
import BaseCommand from '../../src/lib/base'
import * as AI from '../../src/lib/ai/types'
import stripAnsi from '../helpers/strip-ansi'
import {
  addon1, addon1Attachment1,
  addon2, addon2Attachment1, addon2Attachment2,
  addon3, addon3Attachment1, addon3Attachment2,
  addon4, addon4Attachment1,
} from '../helpers/fixtures'
import {flags} from '@heroku-cli/command'

class CommandWithoutConfiguration extends BaseCommand {
  async run() {
    this.herokuAI.get<AI.ModelResource>('/models/01234567-89ab-cdef-0123-456789abcdef')
  }
}

class CommandConfiguredWithoutResourceName extends BaseCommand {
  async run() {
    await this.configureHerokuAIClient()
    await this.herokuAI.get<AI.ModelList>('/models')
  }
}

class CommandConfiguredWithResourceName extends BaseCommand {
  static args = {
    resource_name: Args.string({required: true}),
  }

  static flags = {
    app: flags.app(),
  }

  async run() {
    const {args, flags} = await this.parse(CommandConfiguredWithResourceName)
    const {resource_name: resourceName} = args
    const {app} = flags

    await this.configureHerokuAIClient(resourceName, app)
    await this.herokuAI.get<AI.ModelResource>(`/models/${this.addon.id}`)
  }
}

describe('attempt a request using the Heroku AI client', function () {
  const {env} = process
  let api: nock.Scope
  let herokuAI: nock.Scope

  beforeEach(function () {
    process.env = {}
    api = nock('https://api.heroku.com')
    herokuAI = nock('https://inference-eu.heroku.com')
  })

  afterEach(function () {
    process.env = env
    api.done()
    herokuAI.done()
    nock.cleanAll()
  })

  context('when the client wasn\'t configured', function () {
    it('returns an error message and exits with a status of 1', async function () {
      try {
        await runCommand(CommandWithoutConfiguration, [
          'inference-vertical-01234',
        ])
      } catch (error) {
        const {message, oclif} = error as CLIError
        expect(stripAnsi(message)).to.equal('Heroku AI API Client not configured.')
        expect(oclif.exit).to.equal(1)
      }

      expect(stdout.output).to.equal('')
    })
  })

  context('when the command doesn\'t require a resource name', function () {
    it('makes a request to the default host', async function () {
      const defaultApiHost = nock('https://us.inference.heroku.com')
        .get('/models')
        .reply(200, [])

      await runCommand(CommandConfiguredWithoutResourceName)

      defaultApiHost.done()
    })

    it('respects HEROKU_INFERENCE_HOST', async function () {
      process.env = {
        HEROKU_INFERENCE_HOST: 'my-custom-host.com',
      }

      const customApiHost = nock('https://my-custom-host.com')
        .get('/models')
        .reply(200, [])

      await runCommand(CommandConfiguredWithoutResourceName)

      customApiHost.done()
    })
  })

  context('when the model resource isn\'t fully provisioned', function () {
    beforeEach(async function () {
      api
        .post('/actions/addons/resolve', {addon: addon1.name, app: null})
        .reply(200, [addon1])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon1.name, app: null})
        .reply(200, [addon1Attachment1])
        .get(`/apps/${addon1.app?.id}/config-vars`)
        .reply(200, {})
    })

    it('returns an error message and exits with a status of 1', async function () {
      try {
        await runCommand(CommandConfiguredWithResourceName, [
          addon1.name as string,
        ])
      } catch (error) {
        const {message, oclif} = error as CLIError
        expect(stripAnsi(message)).to.equal('Model resource inference-regular-74659 isn’t fully provisioned on app1.')
        expect(oclif.exit).to.equal(1)
      }

      expect(stdout.output).to.equal('')
    })
  })

  describe('user with unrestricted access to all apps and add-ons', function () {
    context('when using an inexistent model resource name and no app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'inference-inexistent-00001', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'inference-inexistent-00001', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
      })

      it('returns a not found error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            'inference-inexistent-00001',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            We can’t find a model resource called inference-inexistent-00001.
            Run heroku ai:models:info --app <value> to see a list of model resources.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource name with the wrong app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon1.name, app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon1.name, app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
      })

      it('returns a not found error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            addon1.name as string,
            '--app=app2',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            We can’t find a model resource called ${addon1.name} on app2.
            Run heroku ai:models:info --app app2 to see a list of model resources.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource name with non-existent app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon1.name, app: 'app2'})
          .reply(404, [addon1])
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon1.name, app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that app.', resource: 'app'})
      })

      it('returns a custom not found error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            addon1.name as string,
            '--app=app2',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            We can’t find the app2 app. Check your spelling.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using the add-on service slug and no app, matching multiple model resources', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'heroku-inference', app: null})
          .reply(200, [addon1, addon2, addon2, addon3, addon3, addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'heroku-inference', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
      })

      it('returns an ambiguous identifier error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            'heroku-inference',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            Multiple model resources match heroku-inference: ${addon1.name}, ${addon2.name}, ${addon3.name}, ${addon4.name}.
            Specify the model resource by its alias instead.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using the add-on service slug and app, matching a single resource', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'inference', app: 'app2'})
          .reply(200, [addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'inference', app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
          .get(`/addons/${addon4.id}/addon-attachments`)
          .reply(200, [addon4Attachment1])
          .get(`/apps/${addon4Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_KEY: 's3cr3t_k3y',
            INFERENCE_MODEL_ID: 'claude-3-5-sonnet',
            INFERENCE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon4.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'inference',
          '--app=app2',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using the add-on plan slug and no app, matching multiple model resources', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'heroku-inference:claude-3-5-sonnet-latest', app: null})
          .reply(200, [addon2, addon2, addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'heroku-inference:claude-3-5-sonnet-latest', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
      })

      it('returns an ambiguous identifier error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            'heroku-inference:claude-3-5-sonnet-latest',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            Multiple model resources match heroku-inference:claude-3-5-sonnet-latest: ${addon2.name}, ${addon4.name}.
            Specify the model resource by its alias instead.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using the add-on plan slug and app, matching a single resource', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'heroku-inference:claude-3-5-sonnet-latest', app: 'app2'})
          .reply(200, [addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'heroku-inference:claude-3-5-sonnet-latest', app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
          .get(`/addons/${addon4.id}/addon-attachments`)
          .reply(200, [addon4Attachment1])
          .get(`/apps/${addon4Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_KEY: 's3cr3t_k3y',
            INFERENCE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon4.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'heroku-inference:claude-3-5-sonnet-latest',
          '--app=app2',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using a partial attachment name and app, matching multiple model resource attachments', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'INFERENCE', app: 'app1'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'INFERENCE', app: 'app1'})
          .reply(200, [addon2Attachment1, addon2Attachment2, addon3Attachment1])
      })

      it('returns an ambiguous identifier error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            'INFERENCE',
            '--app=app1',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            Multiple model resources match INFERENCE on app1: ${addon2Attachment1.name}, ${addon2Attachment2.name}, ${addon3Attachment1.name}.
            Specify the model resource by its alias instead.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using an exact attachment name and app, matching a single resource', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'INFERENCE_PINK', app: 'app1'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'INFERENCE_PINK', app: 'app1'})
          .reply(200, [addon2Attachment2])
          .get(`/apps/${addon2Attachment2.app?.id}/addons/${addon2Attachment2.addon?.id}`)
          .reply(200, addon2)
          .get(`/apps/${addon2Attachment2.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_PINK_KEY: 's3cr3t_k3y',
            INFERENCE_PINK_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_PINK_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon2.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'INFERENCE_PINK',
          '--app=app1',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource alias with multiple attachments to different apps and no app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon3Attachment1.name, app: null})
          .reply(200, [addon3])
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon3Attachment1.name, app: null})
          .reply(200, [addon3Attachment1])
          .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_MAROON_KEY: 's3cr3t_k3y',
            INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon3Attachment1.addon?.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          addon3Attachment1.name as string,
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource alias with multiple attachments to different apps and the billing app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon3Attachment1.name, app: addon3Attachment1.app?.name})
          .reply(200, [addon3])
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon3Attachment1.name, app: addon3Attachment1.app?.name})
          .reply(200, [addon3Attachment1])
          .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_MAROON_KEY: 's3cr3t_k3y',
            INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon3Attachment1.addon?.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          addon3Attachment1.name as string,
          '--app=app1',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource alias with multiple attachments to different apps and the attached app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon3Attachment2.name, app: addon3Attachment2.app?.name})
          .reply(200, [addon3])
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon3Attachment2.name, app: addon3Attachment2.app?.name})
          .reply(200, [addon3Attachment2])
          .get(`/apps/${addon3Attachment2.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_JADE_KEY: 's3cr3t_k3y',
            INFERENCE_JADE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_JADE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon3Attachment2.addon?.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          addon3Attachment2.name as string,
          '--app=app2',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource alias with multiple attachments to the same app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon2Attachment1.name, app: null})
          .reply(200, [addon2])
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon2Attachment1.name, app: null})
          .reply(200, [addon2Attachment1])
          .get(`/apps/${addon2Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_CYAN_KEY: 's3cr3t_k3y',
            INFERENCE_CYAN_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_CYAN_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon2Attachment1.addon?.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          addon2Attachment1.name as string,
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })
  })

  describe('user with restricted access to apps and add-ons', function () {
    context('when using the add-on service slug, matching a single resource on the accessible app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'inference', app: null})
          .reply(200, [addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'inference', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
          .get(`/addons/${addon4.id}/addon-attachments`)
          .reply(200, [addon4Attachment1])
          .get(`/apps/${addon4Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_KEY: 's3cr3t_k3y',
            INFERENCE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon4.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'inference',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using the add-on plan slug, matching a single resource on the accessible app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'heroku-inference:claude-3-5-sonnet-latest', app: null})
          .reply(200, [addon4])
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'heroku-inference:claude-3-5-sonnet-latest', app: null})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.', resource: 'add_on attachment'})
          .get(`/addons/${addon4.id}/addon-attachments`)
          .reply(200, [addon4Attachment1])
          .get(`/apps/${addon4Attachment1.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_KEY: 's3cr3t_k3y',
            INFERENCE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon4.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'heroku-inference:claude-3-5-sonnet-latest',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using a partial attachment name and app, matching multiple model resource attachments', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'INFERENCE', app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'INFERENCE', app: 'app2'})
          .reply(200, [addon3Attachment2, addon4Attachment1])
      })

      it('returns an ambiguous identifier error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            'INFERENCE',
            '--app=app2',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal(heredoc`
            Multiple model resources match INFERENCE on app2: ${addon3Attachment2.name}, ${addon4Attachment1.name}.
            Specify the model resource by its alias instead.
          `)
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using an exact attachment name and app, matching a single resource', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: 'INFERENCE_JADE', app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: 'INFERENCE_JADE', app: 'app2'})
          .reply(200, [addon3Attachment2])
          .get(`/apps/${addon3Attachment2.app?.id}/addons/${addon3Attachment2.addon?.id}`)
          .reply(200, addon3)
          .get(`/apps/${addon3Attachment2.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_JADE_KEY: 's3cr3t_k3y',
            INFERENCE_JADE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_JADE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon3.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          'INFERENCE_JADE',
          '--app=app2',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource alias and the non-accessible app', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon3Attachment1.name, app: 'app1'})
          .reply(403, {id: 'forbidden', message: 'You do not have access to the app app1'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon3Attachment1.name, app: 'app1'})
          .reply(403, {id: 'forbidden', message: 'You do not have access to the app app1'})
      })

      it('returns a forbidden error message', async function () {
        try {
          await runCommand(CommandConfiguredWithResourceName, [
            addon3Attachment1.name as string,
            '--app=app1',
          ])
        } catch (error) {
          const {message} = error as Error
          expect(stripAnsi(message)).to.equal('You do not have access to the app app1\n\nError ID: forbidden')
        }

        expect(stdout.output).to.equal('')
      })
    })

    context('when using an existent model resource name and the accesible app with the attachment', function () {
      beforeEach(async function () {
        api
          .post('/actions/addons/resolve', {addon: addon3.name, app: 'app2'})
          .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'add_on'})
          .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: 'app2'})
          .reply(200, [addon3Attachment2])
          .get(`/apps/${addon3Attachment2.app?.id}/addons/${addon3Attachment2.addon?.id}`)
          .reply(200, addon3)
          .get(`/apps/${addon3Attachment2.app?.id}/config-vars`)
          .reply(200, {
            INFERENCE_JADE_KEY: 's3cr3t_k3y',
            INFERENCE_JADE_MODEL_ID: 'claude-3-5-sonnet-latest',
            INFERENCE_JADE_URL: 'inference-eu.heroku.com',
          })
      })

      it('makes the request', async function () {
        herokuAI
          .get(`/models/${addon3.id}`)
          .reply(200, {})

        await runCommand(CommandConfiguredWithResourceName, [
          addon3.name as string,
          '--app=app2',
        ])

        expect(stderr.output).to.equal('')
        expect(stdout.output).to.equal('')
      })
    })
  })
})
