import {ux} from '@oclif/core'
import {expect} from 'chai'
import childProcess from 'node:child_process'
import sinon, {SinonSandbox, SinonStub} from 'sinon'
import {stderr, stdout} from 'stdout-stderr'
import Cmd from '../../../src/commands/ai/docs'
import stripAnsi from '../../helpers/strip-ansi'
import {runCommand} from '../../run-command'

describe('ai:docs', function () {
  const {env} = process
  let sandbox: SinonSandbox
  let urlOpener: SinonStub
  let spawnMock: () => any

  beforeEach(function () {
    process.env = {}
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    process.env = env
    sandbox.restore()
  })

  context('when the user accepts the prompt to open the browser', function () {
    beforeEach(function () {
      sandbox.stub(ux, 'anykey').onFirstCall().resolves()
    })

    describe('attempting to open the browser', function () {
      beforeEach(function () {
        urlOpener = sandbox.stub(Cmd, 'urlOpener').onFirstCall().resolves({
          on: (_: string, _cb: ErrorCallback) => {},
        } as unknown as childProcess.ChildProcess)
      })

      context('without --browser option', function () {
        it('shows the URL that will be opened for in the default browser', async function () {
          await runCommand(Cmd)

          expect(stdout.output).to.contain(`Opening ${Cmd.defaultUrl} in your default browser…`)
        })

        it('attempts to open the default browser to the Dev Center AI article', async function () {
          await runCommand(Cmd)

          expect(urlOpener.calledWith(Cmd.defaultUrl, {wait: false})).to.equal(true)
        })
      })

      context('with --browser option', function () {
        it('shows the URL that will be opened in the specified browser', async function () {
          await runCommand(Cmd, [
            '--browser=firefox',
          ])

          expect(stdout.output).to.contain(`Opening ${Cmd.defaultUrl} in firefox browser…`)
        })

        it('attempts to open the specified browser to the Dev Center AI article', async function () {
          await runCommand(Cmd, [
            '--browser=firefox',
          ])

          expect(urlOpener.calledWith(Cmd.defaultUrl, {wait: false, app: {name: 'firefox'}})).to.equal(true)
        })
      })

      it('respects HEROKU_AI_DOCS_URL', async function () {
        const customUrl = 'https://devcenter.heroku.com/articles/custom-article-url'

        process.env = {
          HEROKU_AI_DOCS_URL: customUrl,
        }

        await runCommand(Cmd)

        expect(urlOpener.calledWith(customUrl, {wait: false})).to.equal(true)
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

        await runCommand(Cmd)

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderr.output)).to.contain('Error: error')
        expect(stripAnsi(stderr.output)).to.contain('Warning: Unable to open your default browser.')
        expect(stripAnsi(stderr.output)).to.contain(Cmd.defaultUrl)
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

        await runCommand(Cmd)

        expect(spawnStub.calledOnce).to.be.true
        expect(stripAnsi(stderr.output)).to.contain('Warning: Unable to open your default browser.')
        expect(stripAnsi(stderr.output)).to.contain(Cmd.defaultUrl)
      })
    })
  })

  context('when the user rejects the prompt to open the browser', function () {
    beforeEach(function () {
      urlOpener = sandbox.stub(Cmd, 'urlOpener')
      sandbox.stub(ux, 'anykey').onFirstCall().rejects(new Error('quit'))
    })

    it('doesn’t attempt to open the browser', async function () {
      try {
        await runCommand(Cmd)
      } catch {}

      expect(urlOpener.notCalled).to.equal(true)
    })
  })
})
