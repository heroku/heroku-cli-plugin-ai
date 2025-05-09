import Command from '../../../lib/base'
import {MCPStdioToSSEProxy} from '../../../lib/proxy'
import {flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'

export default class StartCommand extends Command {
  public static description = 'Start the MCP proxy'

  public static flags = {
    json: flags.boolean({
      description: 'output in JSON format',
    }),
    app: flags.app({
      description: 'app to list tools for',
      required: true,
    }),
  }

  public static args = {
    addon: Args.string({
      required: false,
      default: 'heroku-inference',
      description: 'unique identifier or globally unique name of the add-on. If omitted',
    }),
  };

  public async run() {
    const proxy = new MCPStdioToSSEProxy();

    (async () => {
      const {flags} = await this.parse(StartCommand)
      const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${flags.app}/config-vars`)
      const {INFERENCE_MCP_URL, INFERENCE_URL, INFERENCE_KEY} = config
      if (INFERENCE_MCP_URL || INFERENCE_URL) {
        const mcpUrl = INFERENCE_MCP_URL || INFERENCE_URL + '/mcp'
        proxy.setRemoteUrl(new URL(mcpUrl))
        proxy.setToken(INFERENCE_KEY)
      }
    })()

    await proxy.run()
  }
}
