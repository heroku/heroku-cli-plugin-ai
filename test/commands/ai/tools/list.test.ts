import {expect} from 'chai'
import {stdout, stderr} from 'stdout-stderr'
import ListCmd from '../../../../src/commands/ai/tools/list'
import {runCommand} from '../../../run-command'
import nock from 'nock'
import {CLIError} from '@oclif/core/lib/errors'

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
    nock('https://us.inference.heroku.com')
    stdout.start()
    stderr.start()
  })

  afterEach(function () {
    process.env = env
    nock.cleanAll()
    stdout.stop()
    stderr.stop()
  })

  function mockAddonAndConfig(app = 'my-app', addon = 'heroku-inference') {
    herokuAPI
      .post('/actions/addons/resolve')
      .reply(200, [{

        id: 'addon-1',
        name: addon,
        app: {id: 'app-1', name: app},
        addon_service: {id: 'service-1', name: 'heroku-inference'},
        plan: {id: 'plan-1', name: 'heroku-inference:basic'}
        ,
      }])
    herokuAPI
      .post('/actions/addon-attachments/resolve')
      .reply(200, [{

        id: 'attach-1',
        name: 'INFERENCE',
        app: {id: 'app-1', name: app},
        addon: {id: 'addon-1', name: addon, app: {id: 'app-1', name: app}}
        ,
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

    await runCommand(ListCmd, ['--app', 'my-app'])

    expect(stdout.output).to.match(/Tool\s+Description/)
    expect(stdout.output).to.match(/heroku-inference.summarize\s+Summarize text/)
    expect(stdout.output).to.match(/heroku-inference.classify\s+Classify text/)
    expect(stderr.output).to.eq('')
  })

  it('lists all available tools in JSON format', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    await runCommand(ListCmd, ['--app', 'my-app', '--json'])

    expect(() => JSON.parse(stdout.output)).not.to.throw()
    const output = JSON.parse(stdout.output)
    expect(output).to.be.an('array')
    expect(output[0].tools).to.be.undefined // Should be flat array of tools
    expect(output[0].namespaced_name).to.equal('heroku-inference.summarize')
  })

  it('shows info if no tools are available', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, [{...mockServers[0], tools: []}])

    await runCommand(ListCmd, ['--app', 'my-app'])

    expect(stdout.output).to.match(/No AI tools are currently available/)
  })

  it('handles API errors gracefully', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(500, {message: 'Internal Server Error'})

    try {
      await runCommand(ListCmd, ['--app', 'my-app'])
    } catch (error) {
      const err = error as CLIError
      expect(err).to.be.instanceOf(CLIError)
      expect(err.message).to.match(/Internal Server Error/)
    }
  })

  it('uses custom addon when specified', async function () {
    const customAddon = 'custom-inference'
    mockAddonAndConfig('my-app', customAddon)
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    await runCommand(ListCmd, ['--app', 'my-app', customAddon])

    expect(stdout.output).to.match(/Tool\s+Description/)
    expect(stdout.output).to.match(/heroku-inference.summarize\s+Summarize text/)
    expect(stdout.output).to.match(/heroku-inference.classify\s+Classify text/)
    expect(stderr.output).to.eq('')
  })

  it('works without app specified', async function () {
    mockAddonAndConfig()
    nock('https://us.inference.heroku.com')
      .get('/v1/mcp/servers')
      .reply(200, mockServers)

    await runCommand(ListCmd, [])

    expect(stdout.output).to.match(/Tool\s+Description/)
    expect(stdout.output).to.match(/heroku-inference.summarize\s+Summarize text/)
    expect(stdout.output).to.match(/heroku-inference.classify\s+Classify text/)
    expect(stderr.output).to.eq('')
  })
})
