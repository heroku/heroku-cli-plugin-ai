import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import fs from 'node:fs'
import {
  type ChatCompletionRequest,
  ChatCompletionResponse, type CreateEmbeddingRequest,
  EmbeddingResponse,
  type ImageRequest,
  ImageResponse,
  ModelList,
} from '../../../lib/ai/types'
import Command from '../../../lib/base'
import {openUrl} from '../../../lib/open-url'

export default class Call extends Command {
  static args = {
    model_resource: Args.string({
      description: 'Resource ID or alias of the model to call. The --app flag must be included if an alias is used.',
      required: true,
    }),
  }

  static description = 'make an inference request to a specific AI model resource'
  static examples = [
    'heroku ai:models:call my_llm --app my-app --prompt "What is the meaning of life?"',
    'heroku ai:models:call diffusion --app my-app --prompt "Generate an image of a sunset" --opts \'{"quality":"hd"}\' -o sunset.png',
  ]

  static flags = {
    app: flags.app({
      required: false,
      description: 'The name or ID of the app. If an alias for the MODEL_RESOURCE argument is used, this flag is required.',
    }),
    // interactive: flags.boolean({
    //   char: 'i',
    //   description: 'Use interactive mode for conversation beyond the initial prompt (not available on all models)',
    //   default: false,
    // }),
    browser: flags.string({description: 'browser to open URLs with (example: "firefox", "safari")'}),
    json: flags.boolean({char: 'j', description: 'Output response as JSON'}),
    optfile: flags.string({
      description: 'Additional options for model inference, provided as a JSON config file.',
      required: false,
    }),
    opts: flags.string({
      description: 'Additional options for model inference, provided as a JSON string.',
      required: false,
    }),
    output: flags.string({
      char: 'o',
      // description: 'The file path where the command writes the model response. If used with --interactive, this flag writes the entire exchange when the session closes.',
      description: 'The file path where the command writes the model response.',
      required: false,
    }),
    prompt: flags.string({
      char: 'p',
      description: 'The input prompt for the model.',
      required: true,
    }),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Call)
    const {model_resource: modelResource} = args
    const {app, browser, json, optfile, opts, output, prompt} = flags

    // Initially, configure the default client to fetch the available model classes
    await this.configureHerokuAIClient()
    const {body: availableModels} = await this.herokuAI.get<ModelList>('/available-models')

    // Now, configure the client to send a request for the target model resource
    await this.configureHerokuAIClient(modelResource, app)
    const options = this.parseOptions(optfile, opts)
    // Not sure why `type` is an array in ModelListItem, we use the type from the first entry.
    const modelType = availableModels.find(m => m.model_id === this.apiModelId)?.type[0]

    // Note: modelType will always be lower case.  MarcusBlankenship 11/13/24.
    switch (modelType) {
    case 'text-to-embedding': {
      const embedding = await this.createEmbedding(prompt, options as CreateEmbeddingRequest)
      await this.displayEmbedding(embedding, output, json)
      break
    }

    case 'text-to-image': {
      const image = await this.generateImage(prompt, options as ImageRequest)
      await this.displayImageResult(image, output, browser, json)
      break
    }

    case 'text-to-text': {
      const completion = await this.createChatCompletion(prompt, options as ChatCompletionRequest)
      await this.displayChatCompletion(completion, output, json)
      break
    }

    default:
      throw new Error(`Unsupported model type: ${modelType}`)
    }
  }

  /**
   * Parse the model call request options from the command flags.
   *
   * @param optfile Path to a JSON file containing options.
   * @param opts JSON string containing options.
   * @returns The parsed options as an object.
   */
  private parseOptions(optfile?: string, opts?: string): unknown {
    const options = {}

    if (optfile) {
      const optfileContents = fs.readFileSync(optfile)

      try {
        Object.assign(options, JSON.parse(optfileContents.toString()))
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          const {message} = error as SyntaxError
          return ux.error(
            `Invalid JSON in ${color.yellow(optfile)}. Check the formatting in your file.\n${message}`,
            {exit: 1},
          )
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
          return ux.error(
            `Invalid JSON. Check the formatting in your ${color.yellow('--opts')} value.\n${message}`,
            {exit: 1},
          )
        }

        throw error
      }
    }

    return options
  }

  private async createChatCompletion(prompt: string, options: ChatCompletionRequest = {} as ChatCompletionRequest) {
    if (!this.isChatCompletionRequest(options)) {
      return ux.error('Unexpected chat completion options', {exit: 1})
    }

    const {body: chatCompletionResponse} = await this.herokuAI.post<ChatCompletionResponse>('/v1/chat/completions', {
      body: {
        ...options,
        model: this.apiModelId,
        messages: [{
          role: 'user',
          content: prompt,
        }],
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

  private async generateImage(prompt: string, options: ImageRequest = {} as ImageRequest) {
    if (!this.isImageRequest(options)) {
      return ux.error('Unexpected image options', {exit: 1})
    }

    const {body: imageResponse} = await this.herokuAI.post<ImageResponse>('/v1/images/generations', {
      body: {
        ...options,
        model: this.apiModelId,
        prompt,
      },
      headers: {authorization: `Bearer ${this.apiKey}`},
    })

    return imageResponse
  }

  private async displayImageResult(image: ImageResponse, output?: string, browser?: string, json = false) {
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
      else
        await openUrl(image.data[0].url, browser, 'view the image')
      return
    }

    // This should never happen, but we'll handle it anyway
    ux.error('Unexpected response format', {exit: 1})
  }

  private async createEmbedding(input: string, options: CreateEmbeddingRequest = {} as CreateEmbeddingRequest) {
    if (!this.isEmbeddingsRequest(options)) {
      return ux.error('Unexpected embedding options', {exit: 1})
    }

    const {body: EmbeddingResponse} = await this.herokuAI.post<EmbeddingResponse>('/v1/embeddings', {
      body: {
        ...options,
        model: this.apiModelId,
        input,
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

  private isEmbeddingsRequest(obj: unknown): obj is CreateEmbeddingRequest {
    const embeddingRequestKeys = new Set<keyof CreateEmbeddingRequest>([
      'model',
      'user',
      'dimensions',
      'encoding_format',
      'input',
    ])
    const keys = Object.keys(obj ?? {})
    return keys.every(key => embeddingRequestKeys.has(key as keyof CreateEmbeddingRequest))
  }

  private isImageRequest(obj: unknown): obj is ImageRequest {
    const imageRequestKeys = new Set<keyof ImageRequest>([
      'prompt',
      'model',
      'n',
      'quality',
      'response_format',
      'size',
      'style',
      'user',
      'sampler',
      'seed',
      'steps',
      'cfg_scale',
      'clip_guidance_preset',
      'style_preset',
    ])

    const keys = Object.keys(obj ?? {})
    return keys.every(key => imageRequestKeys.has(key as keyof ImageRequest))
  }

  private isChatCompletionRequest(obj: unknown): obj is ChatCompletionRequest {
    const chatCompletionRequestKeys = new Set<keyof ChatCompletionRequest>([
      'messages',
      'model',
      'temperature',
      'top_p',
      'n',
      'stream',
      'stop',
      'max_tokens',
      'presence_penalty',
      'frequency_penalty',
      'tools',
      'tool_choice',
      'user',
    ])
    const keys = Object.keys(obj ?? {})
    return keys.every(key => chatCompletionRequestKeys.has(key as keyof ChatCompletionRequest))
  }
}
