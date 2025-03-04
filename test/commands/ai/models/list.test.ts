import {expect} from 'chai'
import {stderr, stdout} from 'stdout-stderr'
import Cmd from '../../../../src/commands/ai/models/list'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {availableModels, mockAPIErrors} from '../../../helpers/fixtures'
import {CLIError} from '@oclif/core/lib/errors'
import nock from 'nock'

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

    await runCommand(Cmd)

    expect(stdout.output).to.match(/Model\s+Type\s+Regions/)

    expect(stdout.output).to.match(/claude-3-5-sonnet\s+text-to-text\s+eu-central-1, us-east-1/)
    expect(stdout.output).to.match(/claude-3-5-sonnet-latest\s+text-to-text\s+us-east-1/)
    expect(stdout.output).to.match(/claude-3-haiku\s+text-to-text\s+eu-central-1, us-east-1/)
    expect(stdout.output).to.match(/claude-3-5-haiku\s+text-to-text\s+us-east-1/)
    expect(stdout.output).to.match(/cohere-embed-multilingual\s+text-to-embedding\s+us-east-1/)
    expect(stdout.output).to.match(/stable-image-ultra\s+text-to-image\s+eu-central-1, us-east-1/)

    expect(stdout.output).to.contain('See https://devcenter.heroku.com/articles/heroku-inference-api-model-cards for more info')
    expect(stderr.output).to.eq('')
  })

  it('warns if no models are available', async function () {
    const statusURL = 'https://status.heroku.com/'
    const modelsDevCenterURL = 'https://devcenter.heroku.com/articles/heroku-inference-api-model-cards'

    herokuAI
      .get('/available-models')
      .reply(500, mockAPIErrors.modelsListErrorResponse)

    try {
      await runCommand(Cmd)
    } catch (error) {
      const {message} = error as CLIError
      expect(stripAnsi(message)).to.contains('Failed to retrieve the list of available models.')
      expect(stripAnsi(message)).to.contains(statusURL)
      expect(stripAnsi(message)).to.contains(modelsDevCenterURL)
    }
  })
})
