import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import * as Heroku from '@heroku-cli/schema'
import Command from '../../../lib/base'

export default class Detach extends Command {
  static description = 'Detach a model resource from an app.'
  static flags = {
    app: flags.app({description: 'The name of the Heroku app to detach the model resrouce from.', required: true}),
    remote: flags.remote(),
  }

  static args = {
    model_resource: Args.string({
      description: 'The resource ID or alias of the model resource to detach',
      required: true,
    }),
  }

  static example = '$ heroku ai:models:detach claude-3-5-sonnet-acute-41518 --app example-app'

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Detach)
    const {app} = flags
    const {model_resource: modelResource} = args

    const {body: model} = await this.heroku.get<Heroku.AddOnAttachment>(`/apps/${app}/addon-attachments/${modelResource}`)

    ux.action.start(`Detaching ${color.cyan(model.name || '')} to ${color.yellow(model.addon?.name || '')} from ${color.magenta(app)}`)

    await this.heroku.delete(`/addon-attachments/${model.id}`)

    ux.action.stop()

    ux.action.start(`Unsetting ${color.cyan(model.name || '')} config vars and restarting ${color.magenta(app)}`)

    const {body: releases} = await this.heroku.get<Heroku.Release[]>(`/apps/${app}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })

    ux.action.stop(`done, v${releases[0]?.version || ''}`)
  }
}
