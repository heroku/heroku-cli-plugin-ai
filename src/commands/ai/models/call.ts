import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import fs from 'node:fs'
// import path from 'node:path'
import {ChatCompletionResponse, ModelList} from '../../../lib/ai/types'
import Command from '../../../lib/base'

export default class Call extends Command {
  static args = {
    model_resource: Args.string({
      description: 'The resource ID or alias of the model to call.',
      required: true,
    }),
  }

  static description = 'make an inference request to a specific AI model resource'
  static examples = [
    'heroku ai:models:call my_llm --prompt "What is the meaning of life?"',
    'heroku ai:models:call sdxl --prompt "Generate an image of a sunset" --opts \'{"quality": "hd"}\'',
  ]

  static flags = {
    app: flags.app({required: true}),
    // interactive: flags.boolean({
    //   char: 'i',
    //   description: 'Use interactive mode for conversation beyond the initial prompt (not available on all models)',
    //   default: false,
    // }),
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
    const {app, json, optfile, opts, output, prompt} = flags

    // Initially, configure the default client to fetch the available model classes
    await this.configureHerokuAIClient()
    const {body: availableModels} = await this.herokuAI.get<ModelList>('/available-models')

    // Now, configure the client to send a request for the target model resource
    await this.configureHerokuAIClient(modelResource, app)
    const options = this.parseOptions(optfile, opts)
    // Not sure why `type` is an array in ModelListItem, we use the type from the first entry.
    const modelType = availableModels.find(m => m.model_id === this.apiModelId)?.type[0]

    switch (modelType) {
    case 'Embedding':
      break

    case 'Text-to-Image':
      break

    case 'Text-to-Text': {
      const completion = await this.createChatCompletion(prompt, options)
      this.displayChatCompletion(completion, output, json)
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
  private parseOptions(optfile?: string, opts?: string) {
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

  private async createChatCompletion(prompt: string, options = {}) {
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

  private displayChatCompletion(completion: ChatCompletionResponse, output?: string, json = false) {
    const content = json ? JSON.stringify(completion, null, 2) : completion.choices[0].message.content || ''

    if (output) {
      fs.writeFileSync(output, content)
    } else {
      json ? ux.styledJSON(completion) : ux.log(content)
    }
  }
}
