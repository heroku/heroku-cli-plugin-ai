import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import ListCmd from '../../../../src/commands/ai/tools/list.js'
import removeAllWhitespace from '../../../helpers/utils/remove-whitespaces.js'

const mockConfigVars = {
  INFERENCE_KEY: 'fake-key',
  INFERENCE_MODEL_ID: 'fake-model',
  INFERENCE_URL: 'https://us.inference.heroku.com',
}

const mockServers = [
  {
    id: 'server-1',
    app_id: 'app-1',
    process_type: 'web',
    process_command: 'python app.py',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    tools: [
      {
        name: 'summarize',
        namespaced_name: 'heroku-inference.summarize',
        description: 'Summarize text',
        input_schema: {text: {type: 'string'}},
        annotations: {},
      },
      {
        name: 'classify',
        namespaced_name: 'heroku-inference.classify',
        description: 'Classify text',
        input_schema: {text: {type: 'string'}},
        annotations: {},
      },
    ],
    server_status: 'registered',
    primitives_status: 'synced',
    namespace: 'heroku-inference',
  },
]

describe('ai:tools:list', function () {
  const {env} = process
  let herokuAPI: nock.Scope

  beforeEach(function () {
    process.env = {}
    herokuAPI = nock('https://api.heroku.com')
  })

  afterEach(function () {
    process.env = env
    nock.cleanAll()
  })

  function mockAddonAndConfig(app = 'my-app', addon = 'heroku-inference') {
    herokuAPI
      .post('/actions/addons/resolve')
      .reply(200, [{
        id: 'addon-1',
        name: addon,
        app: {id: 'app-1', name: app},
        addon_service: {id: 'service-1', name: 'heroku-inference'},
        plan: {id: 'plan-1', name: 'heroku-inference:basic'},
      }])
    herokuAPI
      .post('/actions/addon-attachments/resolve')
      .reply(200, [{
        id: 'attach-1',
        name: 'INFERENCE',
        app: {id: 'app-1', name: app},
        addon: {id: 'addon-1', name: addon, app: {id: 'app-1', name: app}},
      }])
    herokuAPI
      .get('/apps/app-1/config-vars')
      .reply(200, mockConfigVars)
  }

  it('lists all available tools in table format', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    const {stdout} = await runCommand(ListCmd, ['--app', 'my-app'])
    const stripped = removeAllWhitespace(stdout)

    expect(stripped).to.include('Tool')
    expect(stripped).to.include('Description')
    expect(stripped).to.include('heroku-inference.summarize')
    expect(stripped).to.include('Summarizetext')
    expect(stripped).to.include('heroku-inference.classify')
    expect(stripped).to.include('Classifytext')
  })

  it('lists all available tools in JSON format', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    const {stdout} = await runCommand(ListCmd, ['--app', 'my-app', '--json'])

    expect(() => JSON.parse(stdout)).not.to.throw()
    const output = JSON.parse(stdout)
    expect(output).to.be.an('array')
    expect(output[0].tools).to.be.undefined
    expect(output[0].namespaced_name).to.equal('heroku-inference.summarize')
  })

  it('shows info if no tools are available', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, [{...mockServers[0], tools: []}])

    const {stdout} = await runCommand(ListCmd, ['--app', 'my-app'])

    expect(stdout).to.include('No AI tools are currently available')
  })

  it('handles API errors gracefully', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(500, {message: 'Internal Server Error'})

    const {error} = await runCommand(ListCmd, ['--app', 'my-app'])
    expect(error).to.exist
  })

  it('uses custom addon when specified', async function () {
    const customAddon = 'custom-inference'
    mockAddonAndConfig('my-app', customAddon)
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    const {stdout} = await runCommand(ListCmd, ['--app', 'my-app', customAddon])
    const stripped = removeAllWhitespace(stdout)

    expect(stripped).to.include('heroku-inference.summarize')
    expect(stripped).to.include('heroku-inference.classify')
  })

  it('works without app specified', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    const {stdout} = await runCommand(ListCmd, [])
    const stripped = removeAllWhitespace(stdout)

    expect(stripped).to.include('heroku-inference.summarize')
    expect(stripped).to.include('heroku-inference.classify')
  })
})
