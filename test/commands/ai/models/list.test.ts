import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import Cmd from '../../../../src/commands/ai/models/list.js'
import stripAnsi from '../../../helpers/strip-ansi.js'
import removeAllWhitespace from '../../../helpers/utils/remove-whitespaces.js'
import {availableModels, mockAPIErrors} from '../../../helpers/fixtures.js'

describe('ai:models:list', function () {
  const {env} = process
  let herokuAI: nock.Scope

  beforeEach(function () {
    process.env = {}
    herokuAI = nock('https://us.inference.heroku.com')
  })

  afterEach(function () {
    process.env = env
    herokuAI.done()
    nock.cleanAll()
  })

  it('displays all available models', async function () {
    herokuAI
      .get('/available-models')
      .reply(200, availableModels)

    const {stdout, stderr} = await runCommand(Cmd)
    const stripped = removeAllWhitespace(stdout)

    expect(stripped).to.include('Model')
    expect(stripped).to.include('Type')
    expect(stripped).to.include('Supportedregions')

    expect(stripped).to.include('claude-3-5-sonnet')
    expect(stripped).to.include('text-to-text')
    expect(stripped).to.include('eu-central-1,us-east-1')
    expect(stripped).to.include('claude-3-5-sonnet-latest')
    expect(stripped).to.include('claude-3-haiku')
    expect(stripped).to.include('claude-3-5-haiku')
    expect(stripped).to.include('cohere-embed-multilingual')
    expect(stripped).to.include('text-to-embedding')
    expect(stripped).to.include('stable-image-ultra')
    expect(stripped).to.include('text-to-image')

    expect(stdout).to.contain('See https://devcenter.heroku.com/articles/heroku-inference-api-model-cards for more info')
    expect(stderr).to.eq('')
  })

  it('warns if no models are available', async function () {
    const statusURL = 'https://status.heroku.com/'
    const modelsDevCenterURL = 'https://devcenter.heroku.com/articles/heroku-inference-api-model-cards'

    herokuAI
      .get('/available-models')
      .reply(500, mockAPIErrors.modelsListErrorResponse)

    const {error} = await runCommand(Cmd)
    const message = stripAnsi(error?.message || '')
    expect(message).to.contain('Failed to retrieve the list of available models.')
    expect(message).to.contain(statusURL)
    expect(message).to.contain(modelsDevCenterURL)
  })
})
