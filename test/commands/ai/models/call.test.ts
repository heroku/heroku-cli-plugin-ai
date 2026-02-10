import * as client from '@heroku-cli/command'
import {expect} from 'chai'
import nock from 'nock'
import fs from 'node:fs'
import sinon from 'sinon'
import {stderr, stdout} from 'stdout-stderr'
import heredoc from 'tsheredoc'
import Cmd from '../../../../src/commands/ai/models/call'
import {
  addon3,
  addon3Attachment1,
  addon5,
  addon5Attachment1,
  addon6,
  addon6Attachment1,
  availableModels,
  chatCompletionResponse,
  embeddingsResponse,
  imageContent,
  imageContentBase64,
  imageResponseBase64,
  imageResponseUrl,
  imageUrl,
  stringifiedEmbeddingsVector,
} from '../../../helpers/fixtures'
import stripAnsi from '../../../helpers/strip-ansi'
import {runCommand} from '../../../run-command'

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
    defaultInferenceApi = nock('https://us.inference.heroku.com')
      .get('/available-models')
      .reply(200, availableModels)

    sandbox.replaceGetter(client.APIClient.prototype, 'auth', () => '1234')
  })

  afterEach(function () {
    process.env = env
    api.done()
    defaultInferenceApi.done()
    inferenceApi.done()
    nock.cleanAll()
    sandbox.restore()
    sinon.restore()
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
          INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
          INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
        })
    })

    context('without --json or --output options', function () {
      it('sends the prompt to the service and displays the response content', async function () {
        const prompt = 'Hello, who are you?'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-5-sonnet-latest',
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
          model: 'claude-3-5-sonnet-latest',
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
          expect(stripAnsi(message)).to.contain('Invalid JSON in model-options.json. Check the formatting in your file.')
          expect(stripAnsi(message)).to.contain('Unexpected token')
        }

        expect(readFileSyncMock.calledWith('model-options.json')).to.be.true
        expect(stripAnsi(stderr.output)).to.eq('')
      })

      it('works without --prompt flag when optfile contains messages', async function () {
        const optfileContent = {
          messages: [{role: 'user', content: 'Hello, who are you?'}],
        }
        const readFileSyncMock = sandbox
          .stub(fs, 'readFileSync')
          .returns(JSON.stringify(optfileContent))
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-5-sonnet-latest',
          messages: [{role: 'user', content: 'Hello, who are you?'}],
        }).reply(200, chatCompletionResponse)

        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          '--optfile=model-options.json',
        ])

        expect(readFileSyncMock.calledWith('model-options.json')).to.be.true
        expect(stdout.output).to.eq(heredoc`
          Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
        `)
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
          model: 'claude-3-5-sonnet-latest',
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
          expect(stripAnsi(message)).to.contain('Invalid JSON. Check the formatting in your --opts value.')
          expect(stripAnsi(message)).to.contain('Unexpected token')
        }

        expect(stripAnsi(stderr.output)).to.eq('')
      })

      it('sends the prompt to the service with the specified options', async function () {
        const prompt = 'Hello, who are you?'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/chat/completions', {
          model: 'claude-3-5-sonnet-latest',
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
          model: 'claude-3-5-sonnet-latest',
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
          model: 'claude-3-5-sonnet-latest',
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
          'Hello! I\'m an AI assistant created by a company called Anthropic. It\'s nice to meet you.',
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })

  context('when targeting a diffusion (Text-to-Image) model resource', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon5.name, app: addon5Attachment1.app?.name})
        .reply(200, [addon5])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon5.name, app: addon5Attachment1.app?.name})
        .reply(200, [addon5Attachment1])
        .get(`/apps/${addon5Attachment1.app?.id}/config-vars`)
        .reply(200, {
          DIFFUSION_KEY: 's3cr3t_k3y',
          DIFFUSION_MODEL_ID: 'stable-image-ultra',
          DIFFUSION_URL: 'inference-eu.heroku.com',
        })
    })

    context('without --json or --output options, for Base64 response format', function () {
      it('sends the prompt to the service and shows the Base64-encoded content of the file', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-image-ultra',
          prompt,
          response_format: 'base64',
        }).reply(200, imageResponseBase64)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"base64"}',
        ])

        expect(stdout.output).to.eq(imageContentBase64)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag, but no --output, for Base64 response format', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-image-ultra',
          prompt,
          response_format: 'base64',
        }).reply(200, imageResponseBase64)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"base64"}',
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(imageResponseBase64)
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
          model: 'stable-image-ultra',
          prompt,
          response_format: 'base64',
        }).reply(200, imageResponseBase64)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"base64"}',
          '--output=output-image.png',
        ])

        expect(writeFileSyncMock.calledWith(
          'output-image.png',
          Buffer.from(imageContent),
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
          model: 'stable-image-ultra',
          prompt,
          response_format: 'base64',
        }).reply(200, imageResponseBase64)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--opts={"response_format":"base64"}',
          '--output=image-response.json',
          '--json',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-response.json',
          JSON.stringify(imageResponseBase64, null, 2),
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag, but no --output, for URL response format', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Generate a mocked image'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/images/generations', {
          model: 'stable-image-ultra',
          prompt,
        }).reply(200, imageResponseUrl)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(imageResponseUrl)
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
          model: 'stable-image-ultra',
          prompt,
        }).reply(200, imageResponseUrl)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--output=image-url.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-url.txt',
          imageUrl,
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
          model: 'stable-image-ultra',
          prompt,
        }).reply(200, imageResponseUrl)

        await runCommand(Cmd, [
          'inference-colorful-79696',
          '--app=app2',
          `--prompt=${prompt}`,
          '--output=image-response.json',
          '--json',
        ])

        expect(writeFileSyncMock.calledWith(
          'image-response.json',
          JSON.stringify(imageResponseUrl, null, 2),
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })

  context('when targeting an embeddings model resource', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon6.name, app: addon6Attachment1.app?.name})
        .reply(200, [addon6])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon6.name, app: addon6Attachment1.app?.name})
        .reply(200, [addon6Attachment1])
        .get(`/apps/${addon6Attachment1.app?.id}/config-vars`)
        .reply(200, {
          EMBEDDINGS_KEY: 's3cr3t_k3y',
          EMBEDDINGS_MODEL_ID: 'cohere-embed-multilingual',
          EMBEDDINGS_URL: 'inference-eu.heroku.com',
        })
    })

    context('without --json or --output options', function () {
      it('sends the prompt to the service and displays the embeddings vector', async function () {
        const prompt = 'Heroku Managed Inference Add-on'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/embeddings', {
          input: prompt,
          model: 'cohere-embed-multilingual',
        }).reply(200, embeddingsResponse)

        await runCommand(Cmd, [
          'inference-crystalline-08560',
          '--app=app2',
          `--prompt=${prompt}`,
        ])

        expect(stdout.output).to.contain(stringifiedEmbeddingsVector.slice(0, 64))
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --json flag', function () {
      it('sends the prompt to the service and shows the JSON response', async function () {
        const prompt = 'Heroku Managed Inference Add-on'
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/embeddings', {
          input: prompt,
          model: 'cohere-embed-multilingual',
        }).reply(200, embeddingsResponse)

        await runCommand(Cmd, [
          'inference-crystalline-08560',
          '--app=app2',
          `--prompt=${prompt}`,
          '--json',
        ])

        expect(JSON.parse(stdout.output)).to.deep.equal(embeddingsResponse)
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })

    context('with --output option', function () {
      it('writes to the indicated file', async function () {
        const prompt = 'Heroku Managed Inference Add-on'
        const writeFileSyncMock = sandbox.stub(fs, 'writeFileSync')
        inferenceApi = nock('https://inference-eu.heroku.com', {
          reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
        }).post('/v1/embeddings', {
          input: prompt,
          model: 'cohere-embed-multilingual',
        }).reply(200, embeddingsResponse)

        await runCommand(Cmd, [
          'inference-crystalline-08560',
          '--app=app2',
          `--prompt=${prompt}`,
          '--output=model-output.txt',
        ])

        expect(writeFileSyncMock.calledWith(
          'model-output.txt',
          stringifiedEmbeddingsVector,
        )).to.be.true
        expect(stdout.output).to.eq('')
        expect(stripAnsi(stderr.output)).to.eq('')
      })
    })
  })

  context('when using --model flag to override the default model', function () {
    beforeEach(async function () {
      api.post('/actions/addons/resolve', {addon: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3])
        .post('/actions/addon-attachments/resolve', {addon_attachment: addon3.name, app: addon3Attachment1.app?.name})
        .reply(200, [addon3Attachment1])
        .get(`/apps/${addon3Attachment1.app?.id}/config-vars`)
        .reply(200, {
          INFERENCE_MAROON_KEY: 's3cr3t_k3y',
          INFERENCE_MAROON_MODEL_ID: 'claude-3-5-sonnet-latest',
          INFERENCE_MAROON_URL: 'inference-eu.heroku.com',
        })
    })

    it('uses the --model flag value to override the resource default model', async function () {
      const prompt = 'Hello, who are you?'
      inferenceApi = nock('https://inference-eu.heroku.com', {
        reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
      }).post('/v1/chat/completions', {
        model: 'claude-3-haiku',
        messages: [{role: 'user', content: prompt}],
      }).reply(200, chatCompletionResponse)

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--app=app1',
        `--prompt=${prompt}`,
        '--model=claude-3-haiku',
      ])

      expect(stdout.output).to.eq(heredoc`
        Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.
      `)
      expect(stripAnsi(stderr.output)).to.eq('')
    })

    it('uses --model to invoke a different model type than the resource default', async function () {
      const prompt = 'Generate an image of a sunset'
      inferenceApi = nock('https://inference-eu.heroku.com', {
        reqheaders: {authorization: 'Bearer s3cr3t_k3y'},
      }).post('/v1/images/generations', {
        model: 'stable-image-ultra',
        prompt,
      }).reply(200, imageResponseUrl)

      await runCommand(Cmd, [
        'inference-animate-91825',
        '--app=app1',
        `--prompt=${prompt}`,
        '--model=stable-image-ultra',
        '--json',
      ])

      expect(JSON.parse(stdout.output)).to.deep.equal(imageResponseUrl)
      expect(stripAnsi(stderr.output)).to.eq('')
    })

    it('throws an error when --model specifies an unknown model', async function () {
      const prompt = 'Hello, who are you?'

      try {
        await runCommand(Cmd, [
          'inference-animate-91825',
          '--app=app1',
          `--prompt=${prompt}`,
          '--model=unknown-model',
        ])
        expect.fail('Expected an error to be thrown')
      } catch (error: unknown) {
        const {message} = error as Error
        expect(stripAnsi(message)).to.contain('Unsupported model type: undefined')
        expect(stripAnsi(message)).to.contain("Model 'unknown-model' not found in available models list")
        expect(stripAnsi(message)).to.contain('https://devcenter.heroku.com/categories/ai-models')
      }
    })
  })
})
