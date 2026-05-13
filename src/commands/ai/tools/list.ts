import {flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import {hux} from '@heroku/heroku-cli-util'
import {styledJSON} from '@heroku/heroku-cli-util/hux'
import type {MCPServerList, MCPServerTool} from '@heroku/ai'
import Command from '../../../lib/base.js'

export default class List extends Command {
  static args = {
    addon: Args.string({
      required: false,
      default: 'heroku-inference',
      description: 'unique identifier or globally unique name of add-on',
    }),
  }

  public static description = 'list all available AI tools'
  public static flags = {
    app: flags.app({
      description: 'app to list tools for',
      required: false,
    }),
    json: flags.boolean({
      description: 'output in JSON format',
    }),
  }

  public async run() {
    const {args, flags} = await this.parse(List)
    const tools = (await this.getTools(flags.app, args.addon)).filter(Boolean)

    if (flags.json) {
      styledJSON(tools)
    } else if (tools.length === 0) {
      ux.stdout('No AI tools are currently available for this app')
    } else {
      hux.table(tools as unknown as Record<string, unknown>[], {
        namespaced_name: {header: 'Tool'},
        description: {header: 'Description'},
      })
    }
  }

  private async getTools(app?: string, addon?: string): Promise<MCPServerTool[]> {
    await this.configureHerokuAIClient(addon, app)

    const {body: servers} = await this.herokuAI.get<MCPServerList>('/v1/mcp/servers')

    return servers.flatMap(server => server.tools)
  }
}
