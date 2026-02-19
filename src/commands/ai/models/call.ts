import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import fs from 'node:fs'
import type {
  ChatCompletionResponse,
  EmbeddingResponse,
  ImageResponse,
  ModelList,
  CLIParseError,
} from '@heroku/ai'
import Command from '../../../lib/base'
import {ParserOutput} from '@oclif/core/lib/interfaces/parser'

export type ChatCompletionRequest = {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
} & {prompt: string}

export default class Call extends Command {
  static args = {
    model_resource: Args.string({
      description: 'resource ID or alias of model (--app flag required if alias is used)',
      required: true,
    }),
  }

  static description = 'make an inference request to a specific AI model resource '
  static examples = [
    'heroku ai:models:call my_llm --app my-app --prompt "What is the meaning of life?" --model claude-3-5-sonnet',
    'heroku ai:models:call diffusion --app my-app --prompt "Generate an image of a sunset" --model stable-image-ultra --opts \'{"quality":"hd"}\' -o sunset.png',
  ]

  static flags = {
    app: flags.app({
      required: false,
      description: 'name or ID of app (required if alias is used)',
    }),
    // interactive: flags.boolean({
    //   char: 'i',
    //   description: 'Use interactive mode for conversation beyond the initial prompt (not available on all models)',
    //   default: false,
    // }),
    json: flags.boolean({char: 'j', description: 'output response as JSON '}),
    model: flags.string({
      char: 'm',
      description: 'name of the model being invoked (required for standard plan; cannot be used with legacy model plans)',
      required: false,
    }),
    optfile: flags.string({
      description: 'additional options for model inference, provided as a JSON config file ',
      required: false,
    }),
    opts: flags.string({
      description: 'additional options for model inference, provided as a JSON string ',
      required: false,
    }),
    output: flags.string({
      char: 'o',
      // description: 'The file path where the command writes the model response. If used with --interactive, this flag writes the entire exchange when the session closes.',
      description: 'file path where command writes the model response',
      required: false,
    }),
    prompt: flags.string({
      char: 'p',
      description: 'input prompt for model ',
      required: false,
    }),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    let flags = {} as ParserOutput<Call>['flags']
    let args = {} as ParserOutput<Call>['args']
    try {
      ({args, flags} = await this.parse(Call))
    } catch (error) {
      const {parse: {output}} = error as CLIParseError<Call>
      ({args, flags} = output)
    }

    const {model_resource: modelResource} = args
    const {app, json, model, optfile, opts, output, prompt} = flags

    if (!prompt && !optfile && !opts) {
      throw new Error('You must provide either --prompt, --optfile, or --opts.')
    }

    // Initially, configure the default client to fetch the available model classes
    await this.configureHerokuAIClient()
    const {body: availableModels} = await this.herokuAI.get<ModelList>('/available-models')

    // Now, configure the client to send a request for the target model resource
    await this.configureHerokuAIClient(modelResource, app)
    const options = this.parseOptions(optfile, opts)

    const configModelId = this.apiModelId
    const isLegacyModel = configModelId && availableModels.some(m => m.model_id === configModelId)

    if (isLegacyModel && model) {
      throw new Error('Cannot use --model with legacy model plans. Omit the --model flag to use the configured model or use the standard plan.')
    }

    const modelId = isLegacyModel ? configModelId : model
    if (!modelId) {
      throw new Error('You must provide the --model flag to specify which model to invoke. View available models at https://devcenter.heroku.com/categories/ai-models')
    }

    const modelType = availableModels.find(m => m.model_id === modelId)?.type[0]

    switch (modelType) {
    case 'text-to-embedding': {
      const embedding = await this.createEmbedding(prompt, modelId, options)
      await this.displayEmbedding(embedding, output, json)
      break
    }

    case 'text-to-image': {
      const image = await this.generateImage(prompt, modelId, options)
      await this.displayImageResult(image, output, json)
      break
    }

    case 'text-to-text': {
      const completion = await this.createChatCompletion(prompt, modelId, options)
      await this.displayChatCompletion(completion, output, json)
      break
    }

    default:
      throw new Error(`Unsupported model type: ${modelType}. Model '${modelId}' not found in available models list. View available models at https://devcenter.heroku.com/categories/ai-models`)
    }
  }

  /**
   * Parse the model call request options from the command flags.
   *
   * @param optfile Path to a JSON file containing options.
   * @param opts JSON string containing options.
   * @returns The parsed options as an object.
   */
  private parseOptions(optfile?: string, opts?: string): Record<string, unknown> {
    const options = {}

    if (optfile) {
      const optfileContents = fs.readFileSync(optfile)

      try {
        Object.assign(options, JSON.parse(optfileContents.toString()))
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          const {message} = error as SyntaxError
          throw new Error(`Invalid JSON in ${optfile}. Check the formatting in your file.\n${message}`)
        }

        throw error
      }
    }

    if (opts) {
      try {
        Object.assign(options, JSON.parse(opts))
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          const {message} = error as SyntaxError
          throw new Error(`Invalid JSON. Check the formatting in your --opts value.\n${message}`)
        }

        throw error
      }
    }

    return options
  }

  private async createChatCompletion<T extends Record<string, unknown>>(prompt: string, modelId: string, options = {} as T) {
    const {prompt: optsPrompt, messages = [], ...rest} = options
    if (prompt) {
      (messages as ChatCompletionRequest['messages']).push({role: 'user', content: prompt ?? optsPrompt})
    }

    const {body: chatCompletionResponse} = await this.herokuAI.post<ChatCompletionResponse>('/v1/chat/completions', {
      body: {
        ...rest,
        messages,
        model: modelId,
      },
      headers: {authorization: `Bearer ${this.apiKey}`},
    })

    return chatCompletionResponse
  }

  private async displayChatCompletion(completion: ChatCompletionResponse, output?: string, json = false) {
    const content = completion.choices[0].message.content || ''

    if (output) {
      fs.writeFileSync(output, json ? JSON.stringify(completion, null, 2) : content)
    } else {
      json ? ux.styledJSON(completion) : ux.log(content)
    }
  }

  private async generateImage<T extends Record<string, unknown>>(prompt: string, modelId: string, options = {} as T) {
    const {prompt: optsPrompt, ...rest} = options
    const {body: imageResponse} = await this.herokuAI.post<ImageResponse>('/v1/images/generations', {
      body: {
        ...rest,
        model: modelId,
        prompt: prompt ?? optsPrompt,
      },
      headers: {authorization: `Bearer ${this.apiKey}`},
    })

    return imageResponse
  }

  private async displayImageResult(image: ImageResponse, output?: string, json = false) {
    if (image.data[0].b64_json) {
      if (output) {
        const content = json ? JSON.stringify(image, null, 2) : Buffer.from(image.data[0].b64_json, 'base64')
        fs.writeFileSync(output, content)
      } else
        json ? ux.styledJSON(image) : process.stdout.write(image.data[0].b64_json)
      return
    }

    if (image.data[0].url) {
      if (output)
        fs.writeFileSync(output, json ? JSON.stringify(image, null, 2) : image.data[0].url)
      else if (json)
        ux.styledJSON(image)
      return
    }

    // This should never happen, but we'll handle it anyway
    ux.error('Unexpected response format.', {exit: 1})
  }

  private async createEmbedding<T extends Record<string, unknown>>(input: string, modelId: string, options = {} as T) {
    const {input: optsInput, ...rest} = options
    const {body: EmbeddingResponse} = await this.herokuAI.post<EmbeddingResponse>('/v1/embeddings', {
      body: {
        ...rest,
        model: modelId,
        input: input ?? optsInput,
      },
      headers: {authorization: `Bearer ${this.apiKey}`},
    })

    return EmbeddingResponse
  }

  private async displayEmbedding(embedding: EmbeddingResponse, output?: string, json = false) {
    const content = (embedding.data[0].embeddings || []).toString()

    if (output) {
      fs.writeFileSync(output, json ? JSON.stringify(embedding, null, 2) : content)
    } else {
      json ? ux.styledJSON(embedding) : ux.log(content)
    }
  }
}
