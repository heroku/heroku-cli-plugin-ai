import {runCommand} from '@heroku-cli/test-utils'
import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import childProcess from 'node:child_process'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import Cmd from '../../../src/commands/ai/docs.js'

describe('ai:docs', function () {
  const {env} = process
  let sandbox: SinonSandbox
  let spawnStub: SinonStub

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    sandbox.stub(hux, 'anykey').resolves()
    spawnStub = sandbox.stub(childProcess, 'spawn').returns({
      on: (_: string, _cb: (...args: any[]) => void) => {},
      unref: () => {},
    } as unknown as childProcess.ChildProcess)
  })

  afterEach(function () {
    process.env = env
    sandbox.restore()
  })

  context('without --browser option', function () {
    it('opens the default Dev Center AI article URL', async function () {
      const {stdout} = await runCommand(Cmd)

      expect(stdout).to.include(Cmd.defaultUrl)
      expect(spawnStub.calledOnce).to.be.true
      const [command, args] = spawnStub.firstCall.args
      expect(command).to.eq('open')
      expect(args).to.include(Cmd.defaultUrl)
      expect(args).to.not.include('-a')
    })
  })

  context('with --browser option', function () {
    it('opens the Dev Center AI article with specified browser', async function () {
      const {stdout} = await runCommand(Cmd, [
        '--browser=firefox',
      ])

      expect(stdout).to.include(Cmd.defaultUrl)
      expect(spawnStub.calledOnce).to.be.true
      const [command, args] = spawnStub.firstCall.args
      expect(command).to.eq('open')
      expect(args).to.include('-a')
      expect(args).to.include('firefox')
      expect(args).to.include(Cmd.defaultUrl)
    })
  })

  it('respects HEROKU_AI_DOCS_URL', async function () {
    const customUrl = 'https://devcenter.heroku.com/articles/custom-article-url'

    process.env = {
      HEROKU_AI_DOCS_URL: customUrl,
    }

    const {stdout} = await runCommand(Cmd)

    expect(stdout).to.include(customUrl)
    expect(spawnStub.calledOnce).to.be.true
    const [, args] = spawnStub.firstCall.args
    expect(args).to.include(customUrl)
  })
})
