import {flags} from '@heroku-cli/command'
import Command from '../../../lib/base'

export default class MCP extends Command {
  public static description = 'list all available AI tools'
  public static flags = {
    json: flags.boolean({
      description: 'output in JSON format',
    }),
    app: flags.app({
      description: 'app to list tools for ',
      required: true,
    }),
  }

  public async run() {
    const {flags} = await this.parse(MCP)
    const {body: config} = await this.heroku.get<Record<string, string>>(`/apps/${flags.app}/config-vars`)

    if (config.INFERENCE_MCP_URL) {
      this.log(config.INFERENCE_MCP_URL)
    } else if (config.INFERENCE_URL) {
      this.log(config.INFERENCE_URL + '/mcp')
    } else {
      this.log(`No MCP server URL found for ${flags.app} `)
    }
  }
}
