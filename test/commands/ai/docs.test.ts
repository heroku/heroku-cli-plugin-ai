import {runCommand} from '@heroku-cli/test-utils'
import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import Cmd from '../../../src/commands/ai/docs.js'

describe('ai:docs', function () {
  const {env} = process
  let sandbox: SinonSandbox
  let openUrlStub: SinonStub

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    openUrlStub = sandbox.stub(hux, 'openUrl').resolves()
  })

  afterEach(function () {
    process.env = env
    sandbox.restore()
  })

  context('without --browser option', function () {
    it('opens the default Dev Center AI article URL', async function () {
      await runCommand(Cmd)

      expect(openUrlStub.calledOnce).to.be.true
      const [url, browser] = openUrlStub.firstCall.args
      expect(url).to.equal(Cmd.defaultUrl)
      expect(browser).to.be.undefined
    })
  })

  context('with --browser option', function () {
    it('opens the Dev Center AI article with specified browser', async function () {
      await runCommand(Cmd, [
        '--browser=firefox',
      ])

      expect(openUrlStub.calledOnce).to.be.true
      const [url, browser] = openUrlStub.firstCall.args
      expect(url).to.equal(Cmd.defaultUrl)
      expect(browser).to.equal('firefox')
    })
  })

  it('respects HEROKU_AI_DOCS_URL', async function () {
    const customUrl = 'https://devcenter.heroku.com/articles/custom-article-url'

    process.env = {
      HEROKU_AI_DOCS_URL: customUrl,
    }

    await runCommand(Cmd)

    expect(openUrlStub.calledOnce).to.be.true
    const [url] = openUrlStub.firstCall.args
    expect(url).to.equal(customUrl)
  })
})
