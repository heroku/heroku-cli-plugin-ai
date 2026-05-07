import {expect} from 'chai'
import sinon from 'sinon'
import {hux} from '@heroku/heroku-cli-util'
import {ux} from '@oclif/core/ux'
import confirmCommand from '../../src/lib/confirmCommand.js'
import stripAnsi from '../helpers/strip-ansi.js'

describe('confirmApp', function () {
  let sandbox: sinon.SinonSandbox

  beforeEach(function () {
    sandbox = sinon.createSandbox()
  })

  afterEach(function () {
    sandbox.restore()
  })

  it('should not error or prompt with confirm flag match', async function () {
    await confirmCommand('app', 'app')
  })

  it('should err on confirm flag mismatch', async function () {
    try {
      await confirmCommand('app', 'nope')
      expect.fail('Expected an error')
    } catch (error) {
      expect(stripAnsi((error as Error).message)).to.equal('Confirmation nope did not match app. Aborted.')
    }
  })

  it('should not err on confirm prompt match', async function () {
    sandbox.stub(hux, 'prompt').resolves('app')
    sandbox.stub(ux, 'warn')
    await confirmCommand('app')
  })

  it('should display custom message', async function () {
    sandbox.stub(hux, 'prompt').resolves('app')
    const warnStub = sandbox.stub(ux, 'warn')
    const customMessage = 'custom message'
    await confirmCommand('app', undefined, customMessage)
    expect(warnStub.calledWith(customMessage)).to.be.true
  })

  it('should err on confirm prompt mismatch', async function () {
    sandbox.stub(hux, 'prompt').resolves('nope')
    sandbox.stub(ux, 'warn')
    try {
      await confirmCommand('app')
      expect.fail('Expected an error')
    } catch (error) {
      expect(stripAnsi((error as Error).message)).to.equal('Confirmation did not match app. Aborted.')
    }
  })
})
