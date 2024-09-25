import {expect} from 'chai'
import {stderr, stdout} from 'stdout-stderr'
import Cmd from '../../../../src/commands/ai/models/destroy'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {mockAPIErrors, addon1} from '../../../helpers/fixtures'
import {CLIError} from '@oclif/core/lib/errors'
import nock from 'nock'

describe('ai:models:destroy', function () {
  let herokuAPI: nock.Scope

  beforeEach(function () {
    herokuAPI = nock('https://api.heroku.com:443')
  })

  afterEach(function () {
    herokuAPI.done()
    nock.cleanAll()
  })

  it('displays confirmation of AI addon destruction', async function () {
    const addonAppId = addon1.app?.id
    const addonId = addon1.id
    const addonName = addon1.name
    const appName = addon1.app?.name

    herokuAPI
      .post('/actions/addons/resolve', {app: `${appName}`, addon: `${addonName}`})
      .reply(200, [addon1])
      .get(`/addons/${addonId}/addon-attachments`)
      .reply(200, [addon1])
      .get(`/apps/${addonAppId}/config-vars`)
      .reply(200, {
        INFERENCE_KEY: 's3cr3t_k3y',
        INFERENCE_MODEL_ID: 'claude-3-5-sonnet',
        INFERENCE_URL: 'inference-eu.heroku.com',
      })
      .delete(`/apps/${addonAppId}/addons/${addonId}`, {force: false})
      .reply(200, {...addon1, state: 'deprovisioned'})

    await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`])
    expect(stdout.output).to.contain('test1')
    expect(stderr.output).to.eq('test2')
  })

  // it('warns if no models are available', async function () {
  //   const statusURL = 'https://status.heroku.com/'
  //   const modelsDevCenterURL = 'https://devcenter.heroku.com/articles/rainbow-unicorn-princess-models'

  //   herokuAI
  //     .get('/available-models')
  //     .reply(500, mockAPIErrors.modelsListErrorResponse)

  //   try {
  //     await runCommand(Cmd)
  //   } catch (error) {
  //     const {message} = error as CLIError
  //     expect(stripAnsi(message)).to.contains('Failed to retrieve the list of available models.')
  //     expect(stripAnsi(message)).to.contains(statusURL)
  //     expect(stripAnsi(message)).to.contains(modelsDevCenterURL)
  //   }
  // })
})
