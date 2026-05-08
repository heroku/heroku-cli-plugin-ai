import {flags} from '@heroku-cli/command'
import {Args, Interfaces} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import fs from 'node:fs/promises'
import {ReadableStream} from 'node:stream/web'
import type {AgentRequest, ChatCompletionResponse, CLIParseError} from '@heroku/ai'
import Command from '../../../lib/base.js'
import {formatCompletionMessage, handleAgentStream} from '../../../lib/ai/agents/stream.js'

export default class Call extends Command {
  static baseFlags = Command.baseFlagsWithoutPrompt()
  static args = {
    model_resource: Args.string({
      description: 'resource ID or alias of model (--app flag required if alias is used)',
      required: false,
      default: 'heroku-inference',
    }),
  }

  static description = 'make an inference request to the Heroku Inference Agents API'
  static examples = [
    'heroku ai:agents:call my_llm --app my-app --prompt "What is the current time?"',
    'heroku ai:agents:call my_llm --app my-app --messages \'[{"role":"user","content":"What is the current time?"}]\'',
  ]

  static flags = {
    app: flags.app({
      required: false,
      description: 'name or ID of app (required if alias is used)',
    }),
    json: flags.boolean({
      char: 'j',
      description: 'output response as JSON',
      exclusive: ['output'],
    }),
    messages: flags.string({
      description: 'JSON array of messages to send to the model',
      required: false,
      exclusive: ['prompt'],
      exactlyOne: ['optfile', 'opts'],
    }),
    optfile: flags.string({
      description: 'additional options for model inference, provided as a JSON config file',
      required: false,
      exclusive: ['opts'],
      exactlyOne: ['prompt', 'messages'],
    }),
    opts: flags.string({
      description: 'additional options for model inference, provided as a JSON string',
      required: false,
      exclusive: ['optfile'],
      exactlyOne: ['prompt', 'messages'],
    }),
    output: flags.string({
      char: 'o',
      description: 'file path where command writes the model response',
      required: false,
      exclusive: ['json'],
    }),
    prompt: flags.string({
      char: 'p',
      description: 'input prompt for model (will be converted to a user message)',
      required: false,
      exclusive: ['messages'],
      exactlyOne: ['optfile', 'opts'],
    }),
    remote: flags.remote(),
  }

  private static get allFlags() {
    return {...Call.baseFlags, ...Call.flags}
  }

  public async run(): Promise<void> {
    type CallFlags = Interfaces.InferredFlags<typeof Call.allFlags & typeof Call.flags>
    type CallArgs = Interfaces.InferredArgs<typeof Call.args>

    let parsedFlags = {} as CallFlags
    let parsedArgs = {} as CallArgs
    try {
      const parsed = await this.parse(Call)
      parsedFlags = parsed.flags as CallFlags
      parsedArgs = parsed.args as CallArgs
    } catch (error) {
      const {parse: {output}} = error as CLIParseError<any>
      parsedFlags = output.flags as CallFlags
      parsedArgs = output.args as CallArgs
    }

    const {model_resource: modelResource} = parsedArgs
    const {app, json, messages, optfile, opts, output, prompt} = parsedFlags

    await this.configureHerokuAIClient(modelResource, app)

    const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${this.addon.app?.id}/config-vars`)
    const configVarNames = Object.keys(config)

    const modelResourceKey = configVarNames.find(key => key.startsWith('INFERENCE_') && key.endsWith('_MODEL_ID'))
    if (!modelResourceKey) {
      throw new Error(`No model resource found for ${app}. Check the Heroku Inference documentation for setup instructions: https://devcenter.heroku.com/articles/heroku-inference`)
    }

    const options = await this.parseOptions(optfile, opts)

    const agentRequest = this.createAgentRequest(prompt, messages, options)
    const response = await this.callAgent(agentRequest, !json && !output)
    await this.displayAgentResponse(response, output, json)
  }

  private async parseOptions(optfile?: string, opts?: string): Promise<AgentRequest> {
    const options = {} as AgentRequest

    if (optfile) {
      const optfileContents = await fs.readFile(optfile)

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

  private createAgentRequest(prompt?: string, messagesStr?: string, options: AgentRequest = {} as AgentRequest): AgentRequest {
    let messages: AgentRequest['messages'] = options.messages || []

    if (messagesStr) {
      try {
        messages = JSON.parse(messagesStr)
      } catch (error: unknown) {
        if (error instanceof SyntaxError) {
          const {message} = error as SyntaxError
          throw new Error(`Invalid JSON in --messages. Check the formatting.\n${message}`)
        }

        throw error
      }
    }

    if (prompt) {
      messages.push({role: 'user', content: prompt})
    }

    return {
      ...options,
      messages,
      model: this.apiModelId || '',
    }
  }

  private async callAgent(request: AgentRequest, writeToStdout = true): Promise<ChatCompletionResponse[]> {
    const response = await fetch(this.apiUrl + '/v1/agents/heroku', {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        Accept: 'text/event-stream',
        'User-Agent': `heroku-cli-plugin-ai/${process.env.npm_package_version} ${this.config.platform}`,
      },
    })

    if (!response?.body) {
      throw new Error('No response body received from the API')
    }

    const completions: ChatCompletionResponse[] = []
    await handleAgentStream(response.body as ReadableStream<Uint8Array>, {
      onMessage: completion => {
        completions.push(completion)
        const message = formatCompletionMessage(completion)
        if (message && writeToStdout) {
          ux.stdout(message)
        }
      },
    })
    return completions
  }

  private async displayAgentResponse(completions: ChatCompletionResponse[], output?: string, json = false) {
    if (output) {
      if (json) {
        await fs.writeFile(output, JSON.stringify(completions, null, 2))
      } else {
        const finalAssistantMessage = completions
          .filter(c => c.object === 'chat.completion')
          .pop()?.choices[0].message.content || ''
        await fs.writeFile(output, finalAssistantMessage)
      }
    } else if (json) {
      ux.stdout(ux.colorizeJson(completions))
    }
  }
}
