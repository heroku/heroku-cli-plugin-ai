import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import fs from 'node:fs/promises'
import type {AgentRequest, ChatCompletionResponse, CLIParseError} from '@heroku/ai'
import Command from '../../../lib/base'
import {ParserOutput} from '@oclif/core/lib/interfaces/parser'
import {handleAgentStream, formatCompletionMessage} from '../../../lib/ai/agents/stream'
import {ReadableStream} from 'node:stream/web'

export default class Call extends Command {
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
    optfile: flags.string({
      description: 'additional options for model inference, provided as a JSON config file',
      required: false,
      exclusive: ['opts'],
      exactlyOne: ['prompt', 'messages', 'opts'],
    }),
    opts: flags.string({
      description: 'additional options for model inference, provided as a JSON string',
      required: false,
      exclusive: ['optfile'],
      exactlyOne: ['prompt', 'messages', 'optfile'],
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
      exactlyOne: ['messages', 'optfile', 'opts'],
    }),
    messages: flags.string({
      description: 'JSON array of messages to send to the model',
      required: false,
      exclusive: ['prompt'],
      exactlyOne: ['prompt', 'optfile', 'opts'],
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
    const {app, json, optfile, opts, output, prompt, messages} = flags

    // Configure the client to send a request for the target model resource
    await this.configureHerokuAIClient(modelResource, app)

    // Get config vars to find the model resource
    const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${this.addon.app?.id}/config-vars`)
    const configVarNames = Object.keys(config)

    // Look for model resource in config vars
    const modelResourceKey = configVarNames.find(key => key.startsWith('INFERENCE_') && key.endsWith('_MODEL_ID'))
    if (!modelResourceKey) {
      throw new Error(`No model resource found for ${app}. Check the Heroku Inference documentation for setup instructions: https://devcenter.heroku.com/articles/heroku-inference`)
    }

    const options = await this.parseOptions(optfile, opts)

    // Create the agent request
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
          ux.log(message)
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
        // Write only the final assistant message content
        const finalAssistantMessage = completions
          .filter(c => c.object === 'chat.completion')
          .pop()?.choices[0].message.content || ''
        await fs.writeFile(output, finalAssistantMessage)
      }
    } else if (json) {
      ux.styledJSON(completions)
    }
  }
}
