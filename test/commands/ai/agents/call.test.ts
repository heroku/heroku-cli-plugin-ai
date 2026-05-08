import * as client from '@heroku-cli/command'
import {runCommand} from '@heroku-cli/test-utils'
import {expect} from 'chai'
import nock from 'nock'
import fs from 'node:fs/promises'
import sinon from 'sinon'
import tsheredoc from 'tsheredoc'
const heredoc = tsheredoc.default ?? tsheredoc
import Cmd from '../../../../src/commands/ai/agents/call.js'
import {
  addon3,
  addon3Attachment1,
} from '../../../helpers/fixtures.js'
import stripAnsi from '../../../helpers/strip-ansi.js'

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

        const {stdout, stderr} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
        ])

        expect(stdout).to.eq(heredoc`
          Hello! I'm an AI assistant.
        `)
        expect(stripAnsi(stderr)).to.eq('')
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

        const {stdout, stderr} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout)).to.deep.equal([{
          object: 'chat.completion',
          choices: [{
            message: {
              content: 'Hello! I\'m an AI assistant.',
            },
          }],
        }])
        expect(stripAnsi(stderr)).to.eq('')
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
        const {stdout, stderr} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--messages=${messages}`,
        ])

        expect(stdout).to.eq(heredoc`
          I'm doing well, thank you!
        `)
        expect(stripAnsi(stderr)).to.eq('')
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

        const {stdout, stderr} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--output=agent-output.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'agent-output.txt',
          'Hello! I\'m an AI assistant.',
        )).to.be.true
        expect(stdout).to.eq('')
        expect(stripAnsi(stderr)).to.eq('')
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

        const {stdout, stderr} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
        ])

        expect(stdout).to.eq(heredoc`
          # Hello

          This is markdown
        `)
        expect(stripAnsi(stderr)).to.eq('')
      })
    })

    context('with --opts option', function () {
      it('sends additional options to the service', async function () {
        const readable = new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"Response with opts"}}]}\n'))
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

        const {stdout} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--opts={"temperature":0.5}',
        ])

        expect(stdout).to.include('Response with opts')
      })

      it('throws an error for invalid JSON in --opts', async function () {
        const {error} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--opts=not-valid-json',
        ])

        expect(error?.message).to.include('Invalid JSON. Check the formatting in your --opts value.')
      })
    })

    context('with --optfile option', function () {
      it('throws an error for invalid JSON in the file', async function () {
        sandbox.stub(fs, 'readFile').resolves(Buffer.from('not-valid-json'))

        const {error} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--optfile=bad-options.json',
        ])

        expect(error?.message).to.include('Invalid JSON in bad-options.json')
      })
    })

    context('when API returns no response body', function () {
      it('throws an error', async function () {
        fetchStub
          .withArgs('inference-eu.heroku.com/v1/agents/heroku', {
            method: 'POST',
            body: sinon.match.any,
            headers: sinon.match.any,
          })
          .resolves({body: null} as any)

        const {error} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--prompt=Hello',
        ])

        expect(error?.message).to.eq('No response body received from the API')
      })
    })

    context('with invalid --messages JSON', function () {
      it('throws an error for malformed messages', async function () {
        const {error} = await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--messages=not-valid-json',
        ])

        expect(error?.message).to.include('Invalid JSON in --messages')
      })
    })

  })

  context('when no MODEL_ID config var is found', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3Attachment1])
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, {INFERENCE_MAROON_KEY: 'key', INFERENCE_MAROON_URL: 'url'})
      api
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, {INFERENCE_MAROON_KEY: 'key', INFERENCE_MAROON_URL: 'url'})
    })

    it('throws an error about missing model resource', async function () {
      const {error} = await runCommand(Cmd, [
        'inference-animate-91825',
        '--app=app1',
        '--prompt=Hello',
      ])

      expect(error?.message).to.include('No model resource found')
    })
  })
})
