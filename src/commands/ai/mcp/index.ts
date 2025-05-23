import {flags} from '@heroku-cli/command'
import Command from '../../../lib/base'
import {Args} from '@oclif/core'

export default class MCP extends Command {
  public static description = 'list the MCP server URL'
  public static flags = {
    json: flags.boolean({
      description: 'output in JSON format',
    }),
    app: flags.app({
      description: 'app to list the MCP server URL for',
      required: false,
    }),
  }

  public static args = {
    addon: Args.string({
      required: false,
      default: 'heroku-inference',
      description: 'unique identifier or globally unique name of add-on',
    }),
  }

  public async run() {
    const {flags, args} = await this.parse(MCP)

    // Find the MCP server URL from the billing app's config vars
    await this.configureHerokuAIClient(args.addon, flags.app)
    const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${this.addon.app?.id}/config-vars`)

    const configVarNames = Object.keys(config)
    const inferenceUrlKeyName = configVarNames.find(key => key.startsWith('INFERENCE_') && key.endsWith('_URL'))
    if (inferenceUrlKeyName) {
      this.log(config[inferenceUrlKeyName] + '/mcp')
    } else {
      this.log(`No MCP server URL found for ${flags.app}. Check the Working With MCP On Heroku documentation for setup instructions: https://devcenter.heroku.com/articles/heroku-inference-working-with-mcp`)
    }
  }
}
