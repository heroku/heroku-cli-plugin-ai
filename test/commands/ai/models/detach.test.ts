import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import Cmd from '../../../../src/commands/ai/models/detach.js'
import stripAnsi from '../../../helpers/strip-ansi.js'
import {addon1, addon1Attachment1, mockConfigVars} from '../../../helpers/fixtures.js'

describe('addons:detach', function () {
  let api: nock.Scope
  const {env} = process

  beforeEach(function () {
    process.env = {}
    api = nock('https://api.heroku.com:443')
  })

  afterEach(function () {
    process.env = env
    api.done()
    nock.cleanAll()
  })

  it('detaches an add-on', async function () {
    const addonAppId = addon1.app?.id
    const addonId = addon1.id
    const addonAttachmentId = addon1Attachment1.id
    const addonName = addon1Attachment1.name
    const appName = addon1.app?.name

    api
      .post('/actions/addons/resolve', {app: `${appName}`, addon: `${addonName}`})
      .reply(200, [addon1])
      .get(`/addons/${addonId}/addon-attachments`)
      .reply(200, [addon1Attachment1])
      .get(`/apps/${addonAppId}/config-vars`)
      .reply(200, mockConfigVars)
      .delete(`/addon-attachments/${addonAttachmentId}`)
      .reply(200)
      .get(`/apps/${appName}/releases`)
      .reply(200, [{version: 10}])

    const {stdout, stderr} = await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`])

    expect(stdout).to.equal('')
    expect(stderr).to.contain('done')
    expect(stderr).to.contain('done, v10')
  })

  it('shows an error when the delete request fails', async function () {
    const addonAppId = addon1.app?.id
    const addonId = addon1.id
    const addonAttachmentId = addon1Attachment1.id
    const addonName = addon1Attachment1.name
    const appName = addon1.app?.name

    api
      .post('/actions/addons/resolve', {app: `${appName}`, addon: `${addonName}`})
      .reply(200, [addon1])
      .get(`/addons/${addonId}/addon-attachments`)
      .reply(200, [addon1Attachment1])
      .get(`/apps/${addonAppId}/config-vars`)
      .reply(200, mockConfigVars)
      .delete(`/addon-attachments/${addonAttachmentId}`)
      .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on attachment.'})

    const {error} = await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`])

    expect(stripAnsi(error?.message || '')).to.contain(`We can't find the model alias ${addonName}. Check your spelling.`)
  })
})
