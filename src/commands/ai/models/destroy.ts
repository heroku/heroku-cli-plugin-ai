import {flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import destroyAddon from '../../../lib/ai/models/destroy_addon.js'
import confirmCommand from '../../../lib/confirmCommand.js'
import Command from '../../../lib/base.js'

export default class Destroy extends Command {
  static args = {
    model_resource: Args.string({required: true, description: 'resource ID or alias of model resource to destroy '}),
  }

  static description = 'destroy an existing AI model resource '

  static examples = [
    '$ heroku ai:models:destroy claude-3-5-sonnet-acute-43973 ',
  ]

  static flags = {
    app: flags.app({required: true, description: 'app to run command against '}),
    confirm: flags.string({char: 'c', description: 'set to app name to bypass confirmation prompt'}),
    force: flags.boolean({char: 'f', description: 'allow destruction even if connected to other apps '}),
    remote: flags.remote({description: 'git remote of app to use '}),
  }

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Destroy)
    const {app, confirm} = flags
    const {model_resource: modelResource} = args
    const force = flags.force || process.env.HEROKU_FORCE === '1'

    await this.configureHerokuAIClient(modelResource, app)

    const aiAddon = this.addon

    await confirmCommand(app, confirm)
    await destroyAddon(this.config, aiAddon, force)
  }
}
