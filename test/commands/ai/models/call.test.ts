import fs from 'node:fs'
import {stdout, stderr} from 'stdout-stderr'
import {expect} from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import Cmd from '../../../../src/commands/ai/models/call'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {addon3, addon3Attachment1, availableModels, chatCompletionResponse} from '../../../helpers/fixtures'
import heredoc from 'tsheredoc'

describe('ai:models:call', function () {
  const {env} = process
  let api: nock.Scope
  let defaultInferenceApi: nock.Scope
  let inferenceApi: nock.Scope
  let sandbox: sinon.SinonSandbox

  beforeEach(async function () {
    process.env = {}
    sandbox = sinon.createSandbox()
    api = nock('https://api.heroku.com')
    defaultInferenceApi = nock('https://inference.heroku.com')
      .get('/available-models')
      .reply(200, availableModels)
  })

  afterEach(function () {
    process.env = env
    api.done()
    defaultInferenceApi.done()
    inferenceApi.done()
    nock.cleanAll()
    sandbox.restore()
  })

  context('when targeting a LLM (Text-to-Text) model resource', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3Attachment1])
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_MAROON_KEY: 's3cr3t_k3y',
          INFERENCE_MAROON_MODEL_ID: 'claude-3-sonnet',
          INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
        })
    })

    context('without any optional flags', function () {
      it('sends the prompt to the service and displays the response content', async function () {
        const prompt = 'Hello, who are you?'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
        ])

        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Hello, who are you?'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(chatCompletionResponse)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --optfile option', function () {
      it('shows an error if the file contents isn’t valid JSON', async function () {
        const prompt = 'Hello, who are you?'
        const readFileSyncMock = sandbox.stub(fs, 'readFileSync').returns('invalid json')

        try {
          await runCommand(Cmd, [
            'inference-animate-91825',
            '--app=app1',
            `--prompt=${prompt}`,
            '--optfile=model-options.json',
          ])
        } catch (error: unknown) {
          const {message} = error as SyntaxError
          expect(stripAnsi(message)).to.eq(heredoc`
            Invalid JSON in model-options.json. Check the formatting in your file.
            Unexpected token i in JSON at position 0
          `.trim())
        }

        expect(readFileSyncMock.calledWith('model-options.json')).to.be.true
        expect(stripAnsi(stderr.output)).to.eq('')
      })

      it('sends the prompt to the service with the specified options', async function () {
        const prompt = 'Hello, who are you?'
        const readFileSyncMock = sandbox
          .stub(fs, 'readFileSync')
          .returns(JSON.stringify({
            stream: false,
            temperature: 0.7,
          }))
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
          stream: false,
          temperature: 0.7,
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--optfile=model-options.json',
        ])

        expect(readFileSyncMock.calledWith('model-options.json')).to.be.true
        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --opts option', function () {
      it('shows an error if the string contents isn’t valid JSON', async function () {
        const prompt = 'Hello, who are you?'

        try {
          await runCommand(Cmd, [
            'inference-animate-91825',
            '--app=app1',
            `--prompt=${prompt}`,
            '--opts=invalid json',
          ])
        } catch (error: unknown) {
          const {message} = error as SyntaxError
          expect(stripAnsi(message)).to.eq(heredoc`
            Invalid JSON. Check the formatting in your --opts value.
            Unexpected token i in JSON at position 0
          `.trim())
        }

        expect(stripAnsi(stderr.output)).to.eq('')
      })

      it('sends the prompt to the service with the specified options', async function () {
        const prompt = 'Hello, who are you?'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
          stream: false,
          temperature: 0.7,
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--opts={"stream":false,"temperature":0.7}',
        ])

        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with both --optfile and --opts options', function () {
      it('honors property values from --opts over the ones specified through --optfile', async function () {
        const prompt = 'Hello, who are you?'
        const readFileSyncMock = sandbox
          .stub(fs, 'readFileSync')
          .returns(JSON.stringify({
            stream: false,
            temperature: 0.7,
          }))
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
          stream: false,
          temperature: 0.5,
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--opts={"temperature":0.5}',
          '--optfile=model-options.json',
        ])

        expect(readFileSyncMock.calledWith('model-options.json')).to.be.true
        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
        `)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output option', function () {
      it('writes to the indicated file', async function () {
        const prompt = 'Hello, who are you?'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-sonnet',
          messages: [{role: 'user', content: prompt}],
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--output=model-output.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'model-output.txt',
          "Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.",
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })
})
