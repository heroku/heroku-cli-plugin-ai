import {flags} from '@heroku-cli/command'
import Command from '../../../lib/base'
import {MCPServerList, MCPServerTool} from '../../../lib/ai/types'
import {Args, ux} from '@oclif/core'

export default class List extends Command {
  public static description = 'list all available AI tools'
  public static flags = {
    json: flags.boolean({
      description: 'output in JSON format',
    }),
    app: flags.app({
      description: 'app to list tools for',
      required: true,
    }),
  }

  static args = {
    addon: Args.string({
      required: false,
      default: 'heroku-inference',
      description: 'unique identifier or globally unique name of the add-on. If omitted',
    }),
  };

  public async run() {
    const {flags, args} = await this.parse(List)
    const tools = await this.getTools(flags.app, args.addon)

    if (flags.json) {
      ux.styledJSON(tools)
    } else if (tools.length === 0) {
      ux.info('No AI tools are currently available for this app')
    } else {
      ux.table(tools, {
        namespaced_name: {header: 'Tool', get: tool => tool?.namespaced_name},
        description: {header: 'Description', get: tool => tool?.description},
      })
    }
  }

  private async getTools(app: string, addon: string): Promise<MCPServerTool[]> {
    await this.configureHerokuAIClient(addon, app)

    const {body: servers} = await this.herokuAI.get<MCPServerList>('/v1/mcp/servers')

    return servers.flatMap(server => server.tools)
  }
}
