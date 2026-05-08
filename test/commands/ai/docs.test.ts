import {runCommand} from '@heroku-cli/test-utils'
import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import childProcess from 'node:child_process'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import Cmd from '../../../src/commands/ai/docs.js'

function spawnArgsContain(args: string[], value: string): boolean {
  return args.some(arg => {
    if (arg.includes(value)) return true
    // On Windows, the `open` package base64-encodes a UTF-16LE PowerShell command containing the URL
    try {
      const decoded = Buffer.from(arg, 'base64').toString('utf16le')
      return decoded.includes(value)
    } catch {
      return false
    }
  })
}

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
      expect(spawnArgsContain(args, Cmd.defaultUrl)).to.be.true
      expect(command).to.not.eq('firefox')
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
      const spawnedWithBrowser = command === 'firefox' || spawnArgsContain(args, 'firefox')
      expect(spawnedWithBrowser).to.be.true
      expect(spawnArgsContain(args, Cmd.defaultUrl)).to.be.true
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
    expect(spawnArgsContain(args, customUrl)).to.be.true
  })
})
