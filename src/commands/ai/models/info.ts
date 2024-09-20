import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import Command from '../../../lib/base'
import {ModelInstance} from '../../../lib/ai/types'

export default class Info extends Command {
  static description = 'get the current status of all the AI model instances attached to your app or a specific instance'
  static examples = [
    '$ heroku ai:models:info claude-3-5-sonnet-acute-04281 --app example-app',
    '$ heroku ai:models:info --app example-app',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static args = {
    instance: Args.string({description: 'the resource ID or alias of the model instance to check'}),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Info)
    const {app} = flags
    const {instance} = args
    if (instance) {
      await this.configureHerokuAIClient(instance, app)
      const modelInstanceResponse = await this.herokuAI.get<ModelInstance>(`/models/${this.addonAttachment.id}`)
        .catch(error => {
          if (error.statusCode === 404) {
            ux.warn(`${color.yellow(this.addon.name)} is not yet provisioned.\nRun ${color.cmd('heroku ai:wait')} to wait until the instance is provisioned.`)
          } else {
            throw error
          }
        })
      const {body: modelInstance} = modelInstanceResponse || {body: null}
      if (modelInstance)
        this.displayModelInstance(modelInstance)
    } else {
      throw new Error('Not implemented')
    }
  }

  displayModelInstance(modelInstance: ModelInstance) {
    ux.styledObject({
      'Base Model ID': modelInstance.plan,
      Ready: modelInstance.ready,
      'Tokens In': modelInstance.tokens_in,
      'Tokens Out': modelInstance.tokens_out,
      'Avg Performance': modelInstance.avg_performance,
    })
  }
}
