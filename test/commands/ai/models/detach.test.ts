import {stdout, stderr} from 'stdout-stderr'
import Cmd  from '../../../../src/commands/ai/models/detach'
import {runCommand} from '../../../run-command'
import nock from 'nock'
import {expect} from 'chai'
import {addon1, addon1Attachment1, mockConfigVars} from '../../../helpers/fixtures'

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
    nock.cleanAll
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

    await runCommand(Cmd, [`${addonName}`, '--app', `${appName}`])

    expect(stdout.output).to.equal('')
    expect(stderr.output).to.contain(`Detaching ${addonName} from ${appName}... done`)
    expect(stderr.output).to.contain(`Unsetting ${addonName} config vars and restarting ${appName}... done, v10`)
  })
})
