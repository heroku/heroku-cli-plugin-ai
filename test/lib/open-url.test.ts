import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import childProcess from 'node:child_process'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import stripAnsi from '../helpers/strip-ansi.js'
import {openUrl} from '../../src/lib/open-url.js'

describe('open-url', function () {
  const {env} = process
  let sandbox: SinonSandbox
  let anyKeyStub: SinonStub
  let spawnStub: SinonStub
  let stderrOutput: string
  let stdoutOutput: string
  let originalStdoutWrite: typeof process.stdout.write
  let originalStderrWrite: typeof process.stderr.write

  const url = 'https://example.com'

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    stdoutOutput = ''
    stderrOutput = ''
    originalStdoutWrite = process.stdout.write
    originalStderrWrite = process.stderr.write
    process.stdout.write = ((chunk: string) => {
      stdoutOutput += chunk
      return true
    }) as typeof process.stdout.write
    process.stderr.write = ((chunk: string) => {
      stderrOutput += chunk
      return true
    }) as typeof process.stderr.write
  })

  afterEach(function () {
    sandbox.restore()
    process.env = env
    process.stdout.write = originalStdoutWrite
    process.stderr.write = originalStderrWrite
  })

  context('when the user accepts the prompt to open the browser', function () {
    beforeEach(function () {
      anyKeyStub = sandbox.stub(hux, 'anykey').resolves('')
    })

    describe('attempting to open the browser', function () {
      beforeEach(function () {
        spawnStub = sandbox.stub(childProcess, 'spawn').returns({
          on: (_: string, _cb: (...args: any[]) => void) => {},
          unref: () => {},
        } as unknown as childProcess.ChildProcess)
      })

      context('without browser or action arguments', function () {
        it('shows the URL that will be opened for in the default browser', async function () {
          await openUrl(url)
          expect(stripAnsi(stdoutOutput)).to.contain(`Opening ${url} in your default browser`)
        })

        it('attempts to open the browser', async function () {
          await openUrl(url)
          expect(spawnStub.calledOnce).to.be.true
        })
      })

      context('with browser argument', function () {
        it('shows the URL that will be opened in the specified browser', async function () {
          await openUrl(url, 'firefox')
          expect(stripAnsi(stdoutOutput)).to.contain(`Opening ${url} in firefox browser`)
        })
      })

      context('with action argument', function () {
        it('shows the action to be performed', async function () {
          await openUrl(url, undefined, 'view something')
          expect(anyKeyStub.calledWithMatch(/to view something/)).to.be.true
        })
      })
    })

    context('when there\'s an error opening the browser', function () {
      it('shows a warning', async function () {
        spawnStub = sandbox.stub(childProcess, 'spawn').returns({
          on: (event: string, cb: CallableFunction) => {
            if (event === 'error') cb(new Error('error'))
          },
          unref: () => {},
        } as unknown as childProcess.ChildProcess)

        await openUrl(url)

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderrOutput)).to.contain('Error: error')
        expect(stripAnsi(stderrOutput)).to.contain('Unable to open your default browser.')
        expect(stripAnsi(stderrOutput)).to.contain(url)
      })
    })

    context('when the browser closes with a non-zero exit status', function () {
      it('shows a warning', async function () {
        spawnStub = sandbox.stub(childProcess, 'spawn').returns({
          on: (event: string, cb: CallableFunction) => {
            if (event === 'close') cb(1)
          },
          unref: () => {},
        } as unknown as childProcess.ChildProcess)

        await openUrl(url)

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderrOutput)).to.contain('Unable to open your default browser.')
        expect(stripAnsi(stderrOutput)).to.contain(url)
      })
    })
  })

  context('when the user rejects the prompt to open the browser', function () {
    beforeEach(function () {
      sandbox.stub(hux, 'anykey').rejects(new Error('quit'))
      spawnStub = sandbox.stub(childProcess, 'spawn')
    })

    it('doesn\'t attempt to open the browser', async function () {
      try {
        await openUrl(url)
      } catch {
        // expected
      }

      expect(spawnStub.notCalled).to.equal(true)
    })
  })
})
