import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import {Args, ux} from '@oclif/core'
import {handlePlatformApiErrors, trapConfirmationRequired} from '../../../lib/ai/models/util'
import Command from '../../../lib/base'

export default class Attach extends Command {
  static args = {
    model_resource: Args.string({
      description: 'The resource ID or alias of the model resource to attach.',
      required: true,
    }),
  }

  static description = 'attach an existing model resource to an app'
  static examples = [
    'heroku ai:models:attach claude-3-5-sonnet-acute-41518 --app example-app',
    'heroku ai:models:attach claude-3-5-sonnet-acute-41518 --app example-app --as MY_CS35',
  ]

  static flags = {
    as: flags.string({description: 'alias name for model resource'}),
    confirm: flags.string({description: 'overwrite existing resource with same name'}),
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    const {flags,  args} = await this.parse(Attach)
    const {model_resource: modelResource} = args
    const {app, as, confirm} = flags

    // Here, we purposely resolve the model resource without passing the app name in the flags
    // to the configuration method, because the app flag the user passes in is the target app
    // where the attachment will be created and it's probably a different app from the one
    // where the model resource is provisioned (the billed app).
    await this.configureHerokuAIClient(modelResource)
    const attachment = await trapConfirmationRequired<Required<Heroku.AddOnAttachment>>(
      app, confirm, (confirmed?: string) => this.createAttachment(app, as, confirmed)
    )

    ux.action.start(`Setting ${color.cyan(attachment.name || '')} config vars and restarting ${color.app(app)}`)
    const {body: releases} = await this.heroku.get<Array<Required<Heroku.Release>>>(`/apps/${app}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })
    ux.action.stop(`done, v${releases[0].version}`)
  }

  private async createAttachment(app: string, as?: string, confirmed?: string) {
    const body = {
      name: as, app: {name: app}, addon: {name: this.addon.name}, confirm: confirmed,
    }

    ux.action.start(`Attaching ${color.addon(this.addon.name || '')}${as ? ' as ' + color.cyan(as) : ''} to ${color.app(app)}`)
    const {body: attachment} = await this.heroku.post<Required<Heroku.AddOnAttachment>>('/addon-attachments', {body}).catch(error => {
      ux.action.stop('')
      handlePlatformApiErrors(error, {as})
    })
    ux.action.stop()

    return attachment
  }
}
