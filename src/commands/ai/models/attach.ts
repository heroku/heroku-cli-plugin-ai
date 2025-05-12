import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import {Args, ux} from '@oclif/core'
import {handlePlatformApiErrors, trapConfirmationRequired} from '../../../lib/ai/models/util'
import Command from '../../../lib/base'

export default class Attach extends Command {
  static args = {
    model_resource: Args.string({
      description: 'resource ID or alias of the model resource to attach ',
      required: true,
    }),
  }

  static description = 'attach an existing model resource to an app '
  static examples = [
    'heroku ai:models:attach claude-3-5-sonnet-acute-41518 --source-app example-source-app --target-app example-target-app',
    'heroku ai:models:attach claude-3-5-sonnet-acute-41518 --source-app example-source-app --target-app example-target-app --as MY_CS35',
  ]

  static flags = {
    as: flags.string({description: 'alias name for model resource '}),
    confirm: flags.string({description: 'overwrite existing attached resource with same name '}),
    'source-app': flags.string({char: 's', description: 'source app for model resource ', required: true}),
    'target-app': flags.app({char: 't', description: 'target app for model resource ', required: true}),
    remote: flags.remote({description: 'git remote of target app '}),
  }

  public async run(): Promise<void> {
    const {flags,  args} = await this.parse(Attach)
    const {model_resource: modelResource} = args
    const {as, confirm} = flags
    const sourceApp = flags['source-app'] as string
    const targetApp = flags['target-app'] as string

    await this.configureHerokuAIClient(modelResource, sourceApp)
    const attachment = await trapConfirmationRequired<Required<Heroku.AddOnAttachment>>(
      targetApp, confirm, (confirmed?: string) => this.createAttachment(targetApp, as, confirmed)
    )

    ux.action.start(`Setting ${color.attachment(attachment.name || '')} config vars and restarting ${color.app(targetApp)} `)
    const {body: releases} = await this.heroku.get<Array<Required<Heroku.Release>>>(`/apps/${targetApp}/releases`, {
      partial: true, headers: {Range: 'version ..; max=1, order=desc'},
    })
    ux.action.stop(`done, v${releases[0].version}`)
  }

  private async createAttachment(app: string, as?: string, confirmed?: string) {
    const body = {
      name: as, app: {name: app}, addon: {name: this.addon.name}, confirm: confirmed,
    }

    ux.action.start(`Attaching ${color.addon(this.addon.name || '')}${as ? ' as ' + color.attachment(as) : ''} to ${color.app(app)}`)
    const {body: attachment} = await this.heroku.post<Required<Heroku.AddOnAttachment>>('/addon-attachments', {body}).catch(error => {
      ux.action.stop('')
      handlePlatformApiErrors(error, {as})
    })
    ux.action.stop()

    return attachment
  }
}
