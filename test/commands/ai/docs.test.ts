import {expect} from 'chai'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import Cmd from '../../../src/commands/ai/docs'
import {runCommand} from '../../run-command'
import * as openUrl from '../../../src/lib/open-url'

describe('ai:docs', function () {
  const {env} = process
  let sandbox: SinonSandbox
  let openUrlStub: SinonStub

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    openUrlStub = sandbox.stub(openUrl, 'openUrl').onFirstCall().resolves()
  })

  afterEach(function () {
    process.env = env
    sandbox.restore()
  })

  context('without --browser option', function () {
    it('attempts to open the default browser to the Dev Center AI article', async function () {
      await runCommand(Cmd)

      expect(openUrlStub.calledWith(Cmd.defaultUrl, undefined, 'view the documentation')).to.be.true
    })
  })

  context('with --browser option', function () {
    it('attempts to open the specified browser to the Dev Center AI article', async function () {
      await runCommand(Cmd, [
        '--browser=firefox',
      ])

      expect(openUrlStub.calledWith(Cmd.defaultUrl, 'firefox', 'view the documentation')).to.be.true
    })
  })

  it('respects HEROKU_AI_DOCS_URL', async function () {
    const customUrl = 'https://devcenter.heroku.com/articles/custom-article-url'

    process.env = {
      HEROKU_AI_DOCS_URL: customUrl,
    }

    await runCommand(Cmd)

    expect(openUrlStub.calledWith(customUrl, undefined, 'view the documentation')).to.be.true
  })
})
