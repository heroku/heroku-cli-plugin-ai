import fs from 'node:fs'
import {stdout, stderr} from 'stdout-stderr'
import {expect} from 'chai'
import nock from 'nock'
import sinon from 'sinon'
import Cmd from '../../../../src/commands/ai/models/call'
import * as openUrl from '../../../../src/lib/open-url'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'
import {
  addon3, addon3Attachment1,
  addon5, addon5Attachment1,
  availableModels,
  chatCompletionResponse,
  mockedImageBase64, mockedImageContent, mockedImageResponseBase64,
  mockedImageResponseUrl,
  mockedImageUrl,
} from '../../../helpers/fixtures'
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

    context('without --json or --output options', function () {
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

  context('when targeting a diffusion (Text-to-Image) model resource', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon5Attachment1.name, app: addon5Attachment1.app?.name})
        .reply(200, [addon5])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon5Attachment1.name, app: addon5Attachment1.app?.name})
        .reply(200, [addon5Attachment1])
        .get(`/apps/${addon5Attachment1.app?.id}/config-vars`)
        .reply(200, {
          DIFFUSION_KEY: 's3cr3t_k3y',
          DIFFUSION_MODEL_ID: 'stable-diffusion-xl',
          DIFFUSION_URL: 'inference-eu.heroku.com',
        })
    })

    context('without --json or --output options, for Base64 response format', function () {
      it('sends the prompt to the service and shows the Base64-encoded content of the file', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
          response_format: 'b64_json',
        }).reply(200, mockedImageResponseBase64)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"b64_json"}',
        ])

        expect(stdout.output).to.eq(mockedImageBase64)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag, but no --output, for Base64 response format', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
          response_format: 'b64_json',
        }).reply(200, mockedImageResponseBase64)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"b64_json"}',
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(mockedImageResponseBase64)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output option, but no --json, for Base64 response format', function () {
      it('sends the prompt to the service, decodes the Base64 content and writes it to the indicated file', async function () {
        const prompt = 'Generate a mocked image'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
          response_format: 'b64_json',
        }).reply(200, mockedImageResponseBase64)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"b64_json"}',
          '--output=output-image.png',
        ])

        expect(writeFileSyncMock.calledWith(
          'output-image.png',
          Buffer.from(mockedImageContent),
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output and --json options, for Base64 response format', function () {
      it('sends the prompt to the service and writes full JSON response to the indicated file', async function () {
        const prompt = 'Generate a mocked image'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
          response_format: 'b64_json',
        }).reply(200, mockedImageResponseBase64)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"b64_json"}',
          '--output=image-response.json',
          '--json',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-response.json',
          JSON.stringify(mockedImageResponseBase64, null, 2),
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('without --json or --output options, for URL response format', function () {
      it('sends the prompt to the service and attempts to open the URL on the default browser', async function () {
        const openUrlStub = sandbox.stub(openUrl, 'openUrl').onFirstCall().resolves()
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
        }).reply(200, mockedImageResponseUrl)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
        ])

        expect(openUrlStub.calledWith(mockedImageUrl, undefined, 'view the image')).to.be.true
      })
    })

    context('with --json flag, but no --output, for URL response format', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
        }).reply(200, mockedImageResponseUrl)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(mockedImageResponseUrl)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output option, but no --json, for URL response format', function () {
      it('sends the prompt to the service and writes the URL to the indicated file', async function () {
        const prompt = 'Generate a mocked image'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
        }).reply(200, mockedImageResponseUrl)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--output=image-url.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-url.txt',
          mockedImageUrl,
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output and --json options, for URL response format', function () {
      it('sends the prompt to the service and writes full JSON response to the indicated file', async function () {
        const prompt = 'Generate a mocked image'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-diffusion-xl',
          prompt,
        }).reply(200, mockedImageResponseUrl)

        await runCommand(Cmd, [
          'DIFFUSION',
          '--app=app2',
          `--prompt=${prompt}`,
          '--output=image-response.json',
          '--json',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-response.json',
          JSON.stringify(mockedImageResponseUrl, null, 2),
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })
})
