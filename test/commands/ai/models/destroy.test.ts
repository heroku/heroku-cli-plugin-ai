import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import Cmd from '../../../../src/commands/ai/models/destroy.js'
import stripAnsi from '../../../helpers/strip-ansi.js'
import {addon1, addon1Attachment1, mockAPIErrors, mockConfigVars} from '../../../helpers/fixtures.js'

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
      const {error} = await runCommand(Cmd)
      expect(stripAnsi(error?.message || '')).to.contain('Missing 1 required arg')
      expect(stripAnsi(error?.message || '')).to.contain('model_resource')
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

    const {stderr} = await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`, '--confirm', `${appName}`])
    expect(stderr).to.contain('done')
  })

  it('displays generic error message if destroy request fails without body message', async function () {
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
      .reply(500)

    const {error} = await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`, '--confirm', `${appName}`])
    expect(stripAnsi(error?.message || '')).to.contain(`We can't destroy ${addonName}`)
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

    const {error} = await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`, '--confirm', `${appName}`])
    expect(stripAnsi(error?.message || '')).to.equal(`We can't destroy ${addonName}: ${mockAPIErrors.modelsDestroyErrorResponse.message}.`)
  })
})
