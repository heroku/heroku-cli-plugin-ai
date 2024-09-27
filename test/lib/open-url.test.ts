import {ux} from '@oclif/core'
import {expect} from 'chai'
import childProcess from 'node:child_process'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import {stderr, stdout} from 'stdout-stderr'
import stripAnsi from '../helpers/strip-ansi'
import * as openUrl from '../../src/lib/open-url'

const stdOutputMockStart = () => {
  stderr.start()
  stdout.start()
}

const stdOutputMockStop = () => {
  stderr.stop()
  stdout.stop()
}

describe('open-url', function () {
  const {env} = process
  const url = 'https://example.com'
  let sandbox: SinonSandbox
  let urlOpenerStub: SinonStub
  let anyKeyStub: SinonStub
  let spawnMock: () => any

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    sandbox.restore()
    process.env = env
  })

  context('when the user accepts the prompt to open the browser', function () {
    beforeEach(function () {
      anyKeyStub = sandbox.stub(ux, 'anykey').onFirstCall().resolves()
    })

    describe('attempting to open the browser', function () {
      beforeEach(function () {
        urlOpenerStub = sandbox.stub(openUrl, 'urlOpener').onFirstCall().resolves({
          on: (_: string, _cb: ErrorCallback) => {},
        } as unknown as childProcess.ChildProcess)
      })

      context('without browser or action arguments', function () {
        it('shows the URL that will be opened for in the default browser', async function () {
          stdOutputMockStart()
          await openUrl.openUrl(url)
          stdOutputMockStop()

          expect(stdout.output).to.contain(`Opening ${url} in your default browser…`)
        })

        it('attempts to open the default browser to the url argument', async function () {
          stdOutputMockStart()
          await openUrl.openUrl(url)
          stdOutputMockStop()

          expect(urlOpenerStub.calledWith(url, {wait: false})).to.equal(true)
        })
      })

      context('with browser argument', function () {
        it('shows the URL that will be opened in the specified browser', async function () {
          stdOutputMockStart()
          await openUrl.openUrl(url, 'firefox')
          stdOutputMockStop()

          expect(stdout.output).to.contain(`Opening ${url} in firefox browser…`)
        })

        it('attempts to open the specified browser to the url argument', async function () {
          stdOutputMockStart()
          await openUrl.openUrl(url, 'firefox')
          stdOutputMockStop()

          expect(urlOpenerStub.calledWith(url, {wait: false, app: {name: 'firefox'}})).to.equal(true)
        })
      })

      context('with action argument', function () {
        it('shows the action to be performed', async function () {
          stdOutputMockStart()
          await openUrl.openUrl(url, undefined, 'view something')
          stdOutputMockStop()

          expect(anyKeyStub.calledWithMatch(/to view something/)).to.be.true
        })
      })
    })

    context('when there’s an error opening the browser', function () {
      beforeEach(function () {
        spawnMock = sandbox.stub().returns({
          on: (event: string, cb: CallableFunction) => {
            if (event === 'error') cb(new Error('error'))
          }, unref: () => {},
        })
      })

      it('shows a warning', async function () {
        const spawnStub = sandbox.stub(childProcess, 'spawn').callsFake(spawnMock)

        stdOutputMockStart()
        await openUrl.openUrl(url)
        stdOutputMockStop()

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderr.output)).to.contain('Error: error')
        expect(stripAnsi(stderr.output)).to.contain('Warning: Unable to open your default browser.')
        expect(stripAnsi(stderr.output)).to.contain(url)
      })
    })

    context('when the browser closes with a non-zero exit status', function () {
      beforeEach(function () {
        spawnMock = sandbox.stub().returns({
          on: (event: string, cb: CallableFunction) => {
            if (event === 'close') cb(1)
          }, unref: () => {},
        })
      })

      it('shows a warning', async function () {
        const spawnStub = sandbox.stub(childProcess, 'spawn').callsFake(spawnMock)

        stdOutputMockStart()
        await openUrl.openUrl(url)
        stdOutputMockStop()

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderr.output)).to.contain('Warning: Unable to open your default browser.')
        expect(stripAnsi(stderr.output)).to.contain(url)
      })
    })
  })

  context('when the user rejects the prompt to open the browser', function () {
    beforeEach(function () {
      urlOpenerStub = sandbox.stub(openUrl, 'urlOpener')
      sandbox.stub(ux, 'anykey').onFirstCall().rejects(new Error('quit'))
    })

    it('doesn’t attempt to open the browser', async function () {
      try {
        stdOutputMockStart()
        await openUrl.openUrl(url)
      } catch {
        stdOutputMockStop()
      }

      expect(urlOpenerStub.notCalled).to.equal(true)
    })
  })
})
