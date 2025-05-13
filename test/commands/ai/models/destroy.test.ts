import {expect} from 'chai'
import {stderr} from 'stdout-stderr'
import heredoc from 'tsheredoc'
import Cmd from '../../../../src/commands/ai/models/destroy'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {mockConfigVars, mockAPIErrors, addon1, addon1Attachment1} from '../../../helpers/fixtures'
import {CLIError} from '@oclif/core/lib/errors'
import nock from 'nock'

describe('ai:models:destroy', function () {
  const {env} = process
  let api: nock.Scope

  beforeEach(function () {
    process.env = {}
    api = nock('https://api.heroku.com:443')
  })

  afterEach(function () {
    process.env = env
    api.done()
    nock.cleanAll()
  })

  context('no model resource is provided', function () {
    it('errors when no model resource is provided', async function () {
      try {
        await runCommand(Cmd)
      } catch (error) {
        const {message} = error as CLIError
        expect(stripAnsi(message)).to.eq(heredoc(`
        Missing 1 required arg:
        model_resource  resource ID or alias of model resource to destroy
        See more help with --help`))
      }
    })
  })

  it('displays confirmation of AI addon destruction', async function () {
    const addonAppId = addon1.app?.id
    const addonId = addon1.id
    const addonName = addon1.name
    const appName = addon1.app?.name

    api
      .post('/actions/addons/resolve', {app: `${appName}`, addon: `${addonName}`})
      .reply(200, [addon1])
      .get(`/addons/${addonId}/addon-attachments`)
      .reply(200, [addon1Attachment1])
      .get(`/apps/${addonAppId}/config-vars`)
      .reply(200, mockConfigVars)
      .delete(`/apps/${addonAppId}/addons/${addonId}`, {force: false})
      .reply(200, {...addon1, state: 'deprovisioned'})

    await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`, '--confirm', `${appName}`])
    expect(stderr.output).to.equal(heredoc(`
    Destroying ${addonName} in background.
    The app will restart when complete......
    Destroying ${addonName} in background.
    The app will restart when complete...... done
    `))
  })

  it('displays API error message if destroy request fails', async function () {
    const addonAppId = addon1.app?.id
    const addonId = addon1.id
    const addonName = addon1.name
    const appName = addon1.app?.name

    api
      .post('/actions/addons/resolve', {app: `${appName}`, addon: `${addonName}`})
      .reply(200, [addon1])
      .get(`/addons/${addonId}/addon-attachments`)
      .reply(200, [addon1Attachment1])
      .get(`/apps/${addonAppId}/config-vars`)
      .reply(200, mockConfigVars)
      .delete(`/apps/${addonAppId}/addons/${addonId}`, {force: false})
      .reply(500, mockAPIErrors.modelsDestroyErrorResponse)

    try {
      await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`, '--confirm', `${appName}`])
    } catch (error) {
      const {message} = error as CLIError
      expect(stripAnsi(message)).to.equal(`${addonName} was unable to be destroyed: ${mockAPIErrors.modelsDestroyErrorResponse.message}.`)
    }
  })
})
