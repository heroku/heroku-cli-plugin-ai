import {stdout, stderr} from 'stdout-stderr'
import Cmd  from '../../../../src/commands/ai/models/detach'
import {runCommand} from '../../../run-command'
import nock from 'nock'
import {expect} from 'chai'

describe('addons:detach', function () {
  let api: nock.Scope

  beforeEach(function () {
    api = nock('https://api.heroku.com:443')
  })

  afterEach(function () {
    api.done()
    nock.cleanAll
  })

  it('detaches an add-on', async function () {
    api
      .get('/apps/myapp/addon-attachments/model-123')
      .reply(200, {id: 100, name: 'model-123', addon: {name: 'model'}})
      .delete('/addon-attachments/100')
      .reply(200)
      .get('/apps/myapp/releases')
      .reply(200, [{version: 10}])

    await runCommand(Cmd, ['--app', 'myapp', 'model-123'])

    expect(stdout.output).to.equal('')
    expect(stderr.output).to.contain('Detaching model-123 to model from myapp... done\n')
    expect(stderr.output).to.contain('Unsetting model-123 config vars and restarting myapp... done, v10\n')
  })

  it('returns the correct error message when the model cannot be found', async function () {
    api
      .get('/apps/myapp/addon-attachments/false_model')
      .reply(404, {id: 'not_found', message: 'Couldn\'t find that add on.', resource: 'attachment'})

    try {
      await runCommand(Cmd, ['--app', 'myapp', 'false_model'])
    } catch (error) {
      const {message} = error as Error
      expect(message).to.equal('We can’t find a model resource called false_model. Run \'heroku addons\' to see a list of model resources attached to your app.')
    }
  })

  it('returns the correct error message when the app cannot be found', async function () {
    api
      .get('/apps/wrongapp/addon-attachments/model-123')
      .reply(404, {id: 'not_found', message: 'Couldn\'t find that app.', resource: 'app'})

    try {
      await runCommand(Cmd, ['--app', 'wrongapp', 'model-123'])
    } catch (error) {
      const {message} = error as Error
      expect(message).to.equal('We can’t find the wrongapp app. Check your spelling.')
    }
  })
})
