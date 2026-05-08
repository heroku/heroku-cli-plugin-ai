import {flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import Command from '../../../lib/base.js'

export default class MCP extends Command {
  public static args = {
    addon: Args.string({
      required: false,
      default: 'heroku-inference',
      description: 'unique identifier or globally unique name of add-on',
    }),
  }

  public static description = 'list the MCP server URL'
  public static flags = {
    app: flags.app({
      description: 'app to list the MCP server URL for',
      required: false,
    }),
    json: flags.boolean({
      description: 'output in JSON format',
    }),
  }

  public async run() {
    const {args, flags} = await this.parse(MCP)

    await this.configureHerokuAIClient(args.addon, flags.app)
    const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${this.addon.app?.id}/config-vars`)

    const configVarNames = Object.keys(config)
    const inferenceUrlKeyName = configVarNames.find(key => key.startsWith('INFERENCE_') && key.endsWith('_URL'))
    if (inferenceUrlKeyName) {
      const mcpUrl = config[inferenceUrlKeyName] + '/mcp'
      if (flags.json) {
        ux.stdout(ux.colorizeJson({mcp_url: mcpUrl}))
      } else {
        ux.stdout(mcpUrl)
      }
    } else {
      ux.stdout(`No MCP server URL found for ${flags.app}. Check the Working With MCP On Heroku documentation for setup instructions: https://devcenter.heroku.com/articles/heroku-inference-working-with-mcp`)
    }
  }
}
