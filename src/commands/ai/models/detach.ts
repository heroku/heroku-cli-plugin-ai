import {flags} from '@heroku-cli/command'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client.js'
import * as Heroku from '@heroku-cli/schema'
import {color} from '@heroku/heroku-cli-util'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import Command from '../../../lib/base.js'

export default class Detach extends Command {
  static args = {
    model_resource: Args.string({
      description: 'alias of model resource to detach',
      required: true,
    }),
  }

  static description = 'detach a model resource from an app '

  static example = 'heroku ai:models:detach EXAMPLE_MODEL_ALIAS --app example-app '

  static flags = {
    app: flags.app({description: 'name of app to detach model resource from', required: true}),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Detach)
    const {app} = flags
    const {model_resource: modelResource} = args

    await this.configureHerokuAIClient(modelResource, app)

    const aiAddon = this.addonAttachment

    ux.action.start(`Detaching ${color.cyan(aiAddon.name || '')} from ${color.magenta(app)}`)

    await this.heroku.delete(`/addon-attachments/${aiAddon.id}`).catch(error => {
      ux.action.stop('')
      const error_ = error instanceof HerokuAPIError ? new Error(`We can't find the model alias ${modelResource}. Check your spelling.`) : error.message
      ux.error(error_, {exit: 1})
    })

    ux.action.stop()

    ux.action.start(`Unsetting ${color.cyan(aiAddon.name || '')} config vars and restarting ${color.magenta(app)}.`)

    const {body: releases} = await this.heroku.get<Heroku.Release[]>(`/apps/${app}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })

    ux.action.stop(`done, v${releases[0]?.version || ''}`)
  }
}
