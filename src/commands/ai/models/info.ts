import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import Command from '../../../lib/base'
import {ModelResource} from '../../../lib/ai/types'

export default class Info extends Command {
  static description = 'get the current status of the specified AI model resource attached to your app'
  static examples = [
    'heroku ai:models:info claude-3-5-sonnet-acute-04281 --app example-app',
    'heroku ai:models:info --app example-app',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static args = {
    model_resource: Args.string({description: 'resource ID or alias of the model resource to check'}),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Info)
    const {app} = flags
    const {model_resource: modelResource} = args

    const modelInfo = async () => {
      return this.herokuAI.get<ModelResource>(`/models/${this.apiModelId}`, {
        headers: {authorization: `Bearer ${this.apiKey}`},
      })
        .catch(error => {
          if (error.statusCode === 404) {
            ux.warn(`We can’t find a model resource called ${color.addon(modelResource)}.\nRun ${color.cmd('heroku ai:models:info -a <app>')} to see a list of model resources.`)
          } else {
            throw error
          }
        })
    }

    const addModelProperties = (alias: string, resourceId: string, modelResource: ModelResource = {} as ModelResource) => {
      return Object.assign(modelResource, {model_alias: alias, model_resource_id: resourceId})
    }

    await this.configureHerokuAIClient(modelResource, app as string)
    let {body: currentModelResource} = await modelInfo() ?? {body: {} as ModelResource}
    currentModelResource = addModelProperties(this.modelAlias, this.addonResourceId, currentModelResource)
    this.displayModelResource(currentModelResource)
  }

  displayModelResource(modelResource: ModelResource) {
    ux.log()
    ux.styledHeader(modelResource.model_id)
    ux.styledObject({
      'Base Model ID': modelResource.model_id,
      'Model Alias': modelResource.model_alias,
      'Model Resource ID': modelResource.model_resource_id,
      Ready: modelResource.ready,
      'Tokens In': modelResource.tokens_in,
      'Tokens Out': modelResource.tokens_out,
      'Avg Performance': modelResource.avg_performance,
    })
  }
}
