import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import * as Heroku from '@heroku-cli/schema'
import Command from '../../../lib/base'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client'

export default class Detach extends Command {
  static description = 'detach a model resource from an app'
  static flags = {
    app: flags.app({description: 'name of the Heroku app to detach the model resource from', required: true}),
    remote: flags.remote(),
  }

  static args = {
    model_resource: Args.string({
      description: 'alias of the model resource to detach',
      required: true,
    }),
  }

  static example = 'heroku ai:models:detach claude-3-5-sonnet-acute-41518 --app example-app'

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Detach)
    const {app} = flags
    const {model_resource: modelResource} = args

    await this.configureHerokuAIClient(modelResource, app)

    const aiAddon = this.addon

    ux.action.start(`Detaching ${color.cyan(aiAddon.name || '')} from ${color.magenta(app)}`)

    try {
      await this.heroku.delete(`/addon-attachments/${aiAddon.id}`)
    } catch {
      ux.action.stop('')
      const error = `We can’t find the model alias ${modelResource}. Check your spelling.`
      throw error
    }

    ux.action.stop()

    ux.action.start(`Unsetting ${color.cyan(aiAddon.name || '')} config vars and restarting ${color.magenta(app)}`)

    const {body: releases} = await this.heroku.get<Heroku.Release[]>(`/apps/${app}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })

    ux.action.stop(`done, v${releases[0]?.version || ''}`)
  }
}
