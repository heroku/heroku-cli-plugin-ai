import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import fs from 'node:fs'
import {
  ChatCompletionResponse,
  EmbeddingResponse,
  ImageResponse,
  ModelList,
} from '../../../lib/ai/types'
import Command from '../../../lib/base'
import {CLIParseErrorOptions, ParserOutput} from '@oclif/core/lib/interfaces/parser'

type CLIParseError = CLIParseErrorOptions & {
  parse: {
    input: string,
    output: ParserOutput<Call>
  }
}

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
      description: 'resource ID or alias of model (--app flag must be included if an alias is used)',
      required: true,
    }),
  }

  static description = 'make an inference request to a specific AI model resource '
  static examples = [
    'heroku ai:models:call my_llm --app my-app --prompt "What is the meaning of life?" ',
    'heroku ai:models:call diffusion --app my-app --prompt "Generate an image of a sunset" --opts \'{"quality":"hd"}\' -o sunset.png ',
  ]

  static flags = {
    app: flags.app({
      required: false,
      description: 'name or ID of the app (this flag is required if an alias is used for the MODEL_RESOURCE argument) ',
    }),
    // interactive: flags.boolean({
    //   char: 'i',
    //   description: 'Use interactive mode for conversation beyond the initial prompt (not available on all models)',
    //   default: false,
    // }),
    json: flags.boolean({char: 'j', description: 'output response as JSON '}),
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
      required: true,
    }),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    let flags = {} as ParserOutput<Call>['flags']
    let args = {} as ParserOutput<Call>['args']
    try {
      ({args, flags} = await this.parse(Call))
    } catch (error) {
      const {parse: {output}} = error as CLIParseError
      ({args, flags} = output)
      if (!flags.prompt && !flags.optfile && !flags.opts) {
        throw new Error('You must provide either --prompt, --optfile, or --opts. ')
      }
    }

    const {model_resource: modelResource} = args
    const {app, json, optfile, opts, output, prompt} = flags

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
      const embedding = await this.createEmbedding(prompt, options)
      await this.displayEmbedding(embedding, output, json)
      break
    }

    case 'text-to-image': {
      const image = await this.generateImage(prompt, options)
      await this.displayImageResult(image, output, json)
      break
    }

    case 'text-to-text': {
      const completion = await this.createChatCompletion(prompt, options)
      await this.displayChatCompletion(completion, output, json)
      break
    }

    default:
      throw new Error(`Unsupported model type: ${modelType} `)
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
          return ux.error(
            `Invalid JSON in ${color.yellow(optfile)}. Check the formatting in your file.\n${message} `,
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
            `Invalid JSON. Check the formatting in your ${color.yellow('--opts')} value.\n${message} `,
            {exit: 1},
          )
        }

        throw error
      }
    }

    return options
  }

  private async createChatCompletion<T extends Record<string, unknown>>(prompt: string, options = {} as T) {
    const {prompt: optsPrompt, messages = [], ...rest} = options
    if (prompt) {
      (messages as ChatCompletionRequest['messages']).push({role: 'user', content: prompt ?? optsPrompt})
    }

    const {body: chatCompletionResponse} = await this.herokuAI.post<ChatCompletionResponse>('/v1/chat/completions', {
      body: {
        ...rest,
        messages,
        model: this.apiModelId,
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

  private async generateImage<T extends Record<string, unknown>>(prompt: string, options = {} as T) {
    const {prompt: optsPrompt, ...rest} = options
    const {body: imageResponse} = await this.herokuAI.post<ImageResponse>('/v1/images/generations', {
      body: {
        ...rest,
        model: this.apiModelId,
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

  private async createEmbedding<T extends Record<string, unknown>>(input: string, options = {} as T) {
    const {input: optsInput, ...rest} = options
    const {body: EmbeddingResponse} = await this.herokuAI.post<EmbeddingResponse>('/v1/embeddings', {
      body: {
        ...rest,
        model: this.apiModelId,
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
