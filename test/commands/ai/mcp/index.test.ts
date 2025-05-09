import {expect} from 'chai'
import {stdout, stderr} from 'stdout-stderr'
import MCP from '../../../../src/commands/ai/mcp/index'
import {runCommand} from '../../../run-command'
import nock from 'nock'

// Helper for Heroku API mock
const herokuApi = 'https://api.heroku.com'

describe('ai:mcp', function () {
  let heroku: nock.Scope
  const app = 'test-app'
  const configVarsUrl = `/apps/${app}/config-vars`

  beforeEach(function () {
    heroku = nock(herokuApi)
    stdout.start()
    stderr.start()
  })

  afterEach(function () {
    stdout.stop()
    stderr.stop()
    nock.cleanAll()
  })

  it('prints the MCP server URL if INFERENCE_URL is present', async function () {
    heroku.get(configVarsUrl).reply(200, {INFERENCE_URL: 'https://example.com'})
    await runCommand(MCP, ['--app', app])
    expect(stdout.output).to.contain('https://example.com/mcp')
    expect(stderr.output).to.eq('')
  })

  it('prints a message if INFERENCE_URL is not present', async function () {
    heroku.get(configVarsUrl).reply(200, {})
    await runCommand(MCP, ['--app', app])
    expect(stdout.output).to.contain(`No MCP server URL found for ${app}`)
    expect(stderr.output).to.eq('')
  })
})
