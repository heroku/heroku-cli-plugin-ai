import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import * as Heroku from '@heroku-cli/schema'
import Command from '../../../lib/base'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client'

export default class Detach extends Command {
  static description = 'detach a model resource from an app'
  static flags = {
    app: flags.app({description: 'name of the app to detach the model resource from', required: true}),
    remote: flags.remote(),
  }

  static args = {
    model_resource: Args.string({
      description: 'alias of the model resource to detach',
      required: true,
    }),
  }

  static example = 'heroku ai:models:detach EXAMPLE_MODEL_ALIAS --app example-app'

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Detach)
    const {app} = flags
    const {model_resource: modelResource} = args

    await this.configureHerokuAIClient(modelResource, app)

    const aiAddon = this.addonAttachment

    ux.action.start(`Detaching ${color.cyan(aiAddon.name || '')} from ${color.magenta(app)}`)

    await this.heroku.delete(`/addon-attachments/${aiAddon.id}`).catch(error => {
      ux.action.stop('')
      const error_ = error instanceof HerokuAPIError ? new Error(`We can’t find the model alias ${modelResource}. Check your spelling.`) : error.message
      ux.error(error_, {exit: 1})
    })

    ux.action.stop()

    ux.action.start(`Unsetting ${color.cyan(aiAddon.name || '')} config vars and restarting ${color.magenta(app)}`)

    const {body: releases} = await this.heroku.get<Heroku.Release[]>(`/apps/${app}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })

    ux.action.stop(`done, v${releases[0]?.version || ''}`)
  }
}
