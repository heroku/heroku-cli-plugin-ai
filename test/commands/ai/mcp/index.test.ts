import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import MCP from '../../../../src/commands/ai/mcp/index.js'

const mockConfigVars = {
  INFERENCE_KEY: 'fake-key',
  INFERENCE_MODEL_ID: 'fake-model',
  INFERENCE_URL: 'https://example.com',
}

describe('ai:mcp', function () {
  const {env} = process
  let heroku: nock.Scope
  const app = 'test-app'

  beforeEach(function () {
    process.env = {}
    heroku = nock('https://api.heroku.com')
  })

  afterEach(function () {
    process.env = env
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
    const {stdout} = await runCommand(MCP, ['--app', app])
    expect(stdout).to.contain('https://example.com/mcp')
  })

  it('prints the MCP server URL as JSON when --json is passed', async function () {
    mockAddonAndConfig()
    const {stdout} = await runCommand(MCP, ['--app', app, '--json'])
    const output = JSON.parse(stdout)
    expect(output).to.deep.equal({mcp_url: 'https://example.com/mcp'})
  })

  it('handles API errors gracefully', async function () {
    this.timeout(10_000)
    heroku
      .post('/actions/addons/resolve')
      .reply(500, {id: 'internal_server_error', message: 'Internal Server Error'})

    const {error} = await runCommand(MCP, ['--app', app])
    expect(error).to.exist
  })

  it('uses custom addon when specified', async function () {
    const customAddon = 'custom-inference'
    mockAddonAndConfig(app, customAddon)
    const {stdout} = await runCommand(MCP, ['--app', app, customAddon])
    expect(stdout).to.contain('https://example.com/mcp')
  })

  it('works without app specified', async function () {
    mockAddonAndConfig()
    const {stdout} = await runCommand(MCP, [])
    expect(stdout).to.contain('https://example.com/mcp')
  })

  it('shows a message when no INFERENCE_URL config var is found', async function () {
    heroku
      .post('/actions/addons/resolve')
      .reply(200, [{
        id: 'addon-1',
        name: 'heroku-inference',
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
        addon: {id: 'addon-1', name: 'heroku-inference', app: {id: 'app-1', name: app}},
      }])
    heroku
      .get('/apps/app-1/config-vars')
      .reply(200, {INFERENCE_KEY: 'fake-key', INFERENCE_MODEL_ID: 'fake-model', INFERENCE_URL: 'https://example.com'})
    heroku
      .get('/apps/app-1/config-vars')
      .reply(200, {SOME_OTHER_VAR: 'value'})

    const {stdout} = await runCommand(MCP, ['--app', app])
    expect(stdout).to.contain('No MCP server URL found')
  })
})
