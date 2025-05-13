import {expect} from 'chai'
import {stdout, stderr} from 'stdout-stderr'
import MCP from '../../../../src/commands/ai/mcp/index'
import {runCommand} from '../../../run-command'
import nock from 'nock'
import {CLIError} from '@oclif/core/lib/errors'

const mockConfigVars = {
  INFERENCE_URL: 'https://example.com',
  INFERENCE_KEY: 'fake-key',
  INFERENCE_MODEL_ID: 'fake-model',
}

describe('ai:mcp', function () {
  const {env} = process
  let heroku: nock.Scope
  const app = 'test-app'

  beforeEach(function () {
    process.env = {}
    heroku = nock('https://api.heroku.com')
    stdout.start()
    stderr.start()
  })

  afterEach(function () {
    process.env = env
    stdout.stop()
    stderr.stop()
    nock.cleanAll()
  })

  function mockAddonAndConfig(app = 'test-app', addon = 'heroku-inference') {
    heroku
      .post('/actions/addons/resolve')
      .reply(200, [{
        id: 'addon-1',
        name: addon,
        app: {id: 'app-1', name: app},
        addon_service: {id: 'service-1', name: 'heroku-inference'},
        plan: {id: 'plan-1', name: 'heroku-inference:basic'},
      }])
    heroku
      .post('/actions/addon-attachments/resolve')
      .reply(200, [{
        id: 'attach-1',
        name: 'INFERENCE',
        app: {id: 'app-1', name: app},
        addon: {id: 'addon-1', name: addon, app: {id: 'app-1', name: app}},
      }])
    heroku
      .get('/apps/app-1/config-vars')
      .reply(200, mockConfigVars)
    heroku
      .get('/apps/app-1/config-vars')
      .reply(200, mockConfigVars)
  }

  it('prints the MCP server URL if INFERENCE_URL is present', async function () {
    mockAddonAndConfig()
    await runCommand(MCP, ['--app', app])
    expect(stdout.output).to.contain('https://example.com/mcp')
    expect(stderr.output).to.eq('')
  })

  it('handles API errors gracefully', async function () {
    mockAddonAndConfig()
    heroku.get('/apps/app-1/config-vars').reply(500, {message: 'Internal Server Error'})

    try {
      await runCommand(MCP, ['--app', app])
    } catch (error) {
      const err = error as CLIError
      expect(err).to.be.instanceOf(CLIError)
      expect(err.message).to.match(/Internal Server Error/)
    }
  })

  it('uses custom addon when specified', async function () {
    const customAddon = 'custom-inference'
    mockAddonAndConfig(app, customAddon)
    await runCommand(MCP, ['--app', app, customAddon])
    expect(stdout.output).to.contain('https://example.com/mcp')
    expect(stderr.output).to.eq('')
  })

  it('works without app specified', async function () {
    mockAddonAndConfig()
    await runCommand(MCP, [])
    expect(stdout.output).to.contain('https://example.com/mcp')
    expect(stderr.output).to.eq('')
  })
})
