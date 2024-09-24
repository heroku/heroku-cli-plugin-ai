import {Args, ux} from '@oclif/core'
import {flags} from '@heroku-cli/command'
import {ModelList} from '../../../lib/ai/types'
import Command from '../../../lib/base'

export default class Destroy extends Command {
  static description = 'destroy an existing AI model resource'

  static flags = {
    app: flags.app({required: true, description: 'app to run command against'}),
    confirm: flags.string({char: 'c'}),
    force: flags.boolean({char: 'f', description: 'allow destruction even if connected to other apps'}),
    remote: flags.remote({description: 'git remote of app to use'}),
  }

  static args = {
    modelResource: Args.string({required: true, description: 'The resource ID or alias of the model resource to destroy.'}),
  };

  static examples = [
    '$ heroku ai:models:destroy claude-3-5-sonnet-acute-43973',
  ]

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Destroy)
    const {app, confirm} = flags
    const {modelResource} = args
    const force = flags.force || process.env.HEROKU_FORCE === '1'

    await this.configureHerokuAIClient(modelResource, app)

    const aiAddonId = this.addon.id
    console.log('aiAddonId', aiAddonId)

    // const herokuClient = this.herokuAI

    // const {body: availableModels} = await herokuAIClient.get<ModelList>(urlPath)
  }
}
