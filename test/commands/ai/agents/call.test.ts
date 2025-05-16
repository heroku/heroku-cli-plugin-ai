import * as client from '@heroku-cli/command'
import {expect} from 'chai'
import nock from 'nock'
import fs from 'node:fs/promises'
import sinon from 'sinon'
import {stderr, stdout} from 'stdout-stderr'
import heredoc from 'tsheredoc'
import Cmd from '../../../../src/commands/ai/agents/call'
import {
  addon3,
  addon3Attachment1,
} from '../../../helpers/fixtures'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'

describe('ai:agents:call', function () {
  const {env} = process
  let api: nock.Scope
  let sandbox: sinon.SinonSandbox
  let fetchStub: typeof fetch & sinon.SinonStub
  const mockConfigVars = {
    INFERENCE_MAROON_KEY: 's3cr3t_k3y',
    INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
    INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
  }

  beforeEach(async function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    api = nock('https://api.heroku.com')
    sandbox.replaceGetter(client.APIClient.prototype, 'auth', () => '1234')
    fetchStub = sinon.stub(globalThis, 'fetch')
  })

  afterEach(function () {
    process.env = env
    api.done()
    nock.cleanAll()
    sandbox.restore()
    sinon.restore()
  })

  context('when calling the agent API', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3Attachment1])
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, mockConfigVars)
      api
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, mockConfigVars)
    })

    context('without --json or --output options', function () {
      it('sends the prompt to the service and displays the response content', async function () {
        const prompt = 'Hello, who are you?'
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"Hello! I\'m an AI assistant."}}]}\n'))
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
            controller.close()
          },
        })
        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves(new Response(readable))

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
        ])

        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant.
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Hello, who are you?'
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"Hello! I\'m an AI assistant."}}]}\n'))
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
            controller.close()
          },
        })

        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves(new Response(readable))

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal([{
          object: 'chat.completion',
          choices: [{
            message: {
              content: 'Hello! I\'m an AI assistant.',
            },
          }],
        }])
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --messages option', function () {
      it('sends the messages to the service', async function () {
        const messages = JSON.stringify([{role: 'user', content: 'Hello'}, {role: 'assistant', content: 'Hi'}, {role: 'user', content: 'How are you?'}])
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"I\'m doing well, thank you!"}}]}\n'))
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
            controller.close()
          },
        })

        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves(new Response(readable))
        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--messages=${messages}`,
        ])

        expect(stdout.output).to.eq(heredoc`
          I'm doing well, thank you!
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output option', function () {
      it('writes to the indicated file', async function () {
        const prompt = 'Hello, who are you?'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFile')
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"Hello! I\'m an AI assistant."}}]}\n'))
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
            controller.close()
          },
        })

        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves(new Response(readable))

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--output=agent-output.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'agent-output.txt',
          'Hello! I\'m an AI assistant.',
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with tool completion', function () {
      it('displays tool output correctly', async function () {
        const prompt = 'Convert this HTML to markdown'
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"tool.completion","choices":[{"message":{"content":"Tool \'html_to_markdown\' returned result: {\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"# Hello\\\\n\\\\nThis is markdown\\"}]}"}}]}\n'))
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
            controller.close()
          },
        })

        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves(new Response(readable))

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
        ])

        expect(stdout.output).to.eq(heredoc`
          # Hello

          This is markdown
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })
})
