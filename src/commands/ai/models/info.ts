import {flags} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import * as color from '@heroku/heroku-cli-util/color'
import {hux} from '@heroku/heroku-cli-util'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import type {ModelResource} from '@heroku/ai'
import Command from '../../../lib/base.js'

export default class Info extends Command {
  static args = {
    model_resource: Args.string({description: 'resource ID or alias of model resource '}),
  }

  static description = 'get current status of a specific AI model resource or all AI model resources attached to an app'

  static examples = [
    'heroku ai:models:info claude-3-5-sonnet-acute-04281 --app example-app ',
    'heroku ai:models:info --app example-app ',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  public async run(): Promise<any> {
    const {args, flags} = await this.parse(Info)
    const {app} = flags
    const {model_resource: modelResource} = args
    const synthesizedModels: Array<ModelResource> = []
    let listOfProvisionedModels: Array<ModelResource> = []

    const modelInfo = async () => {
      const modelInfoResponse = await this.herokuAI.get<ModelResource>(`/models/${this.addon.id}`, {
        headers: {authorization: `Bearer ${this.apiKey}`},
      })
        .catch(error => {
          if (error.statusCode === 404) {
            ux.warn(`We can't find a model resource called ${color.addon(modelResource)}.\nUse ${color.command('heroku ai:models:info -a <app>')} to see a list of model resources.`)
          } else {
            throw error
          }
        })

      return modelInfoResponse
    }

    const addModelProperties = (alias: string, resourceId: string, modelResource: ModelResource = {} as ModelResource) => Object.assign(modelResource, {model_alias: alias, model_resource_id: resourceId})

    const getModelDetails = async (collectedModels: Array<Heroku.AddOn> | string) => {
      if (typeof collectedModels === 'string') {
        const modelResource = collectedModels
        await this.configureHerokuAIClient(modelResource, app)

        let {body: currentModelResource} = await modelInfo() ?? {body: {} as ModelResource}
        currentModelResource = addModelProperties(this.modelAlias, this.addonResourceId, currentModelResource)
        synthesizedModels.push(currentModelResource!)
      } else {
        for (const addonModel of collectedModels) {
          await this.configureHerokuAIClient(addonModel.modelResource, app)

          let {body: currentModelResource} = await modelInfo() ?? {body: {} as ModelResource}
          currentModelResource = addModelProperties(this.modelAlias, this.addonResourceId, currentModelResource)
          synthesizedModels.push(currentModelResource!)
        }
      }

      return synthesizedModels
    }

    if (modelResource) {
      listOfProvisionedModels = await getModelDetails(modelResource)
    } else {
      const provisionedModelsInfo: Record<string, string | undefined>[] = []
      const inferenceRegex = /inference/
      const {body: addonsResponse} = await this.heroku.get<Heroku.AddOn>(`/apps/${app}/addons`, {
        headers: {'Accept-Expansion': 'plan'},
      })

      for (const addonInfo of addonsResponse as Array<Heroku.AddOn>) {
        const addonType = addonInfo.addon_service?.name || ''
        const isModelAddon = inferenceRegex.test(addonType)

        if (isModelAddon) {
          provisionedModelsInfo.push({
            addonName: addonInfo.addon_service?.name,
            modelResource: addonInfo.name,
            modelId: addonInfo.addon_service?.id,
          })
        }
      }

      listOfProvisionedModels = await getModelDetails(provisionedModelsInfo)
    }

    this.displayModelResource(listOfProvisionedModels)
  }

  displayModelResource(modelResources: ModelResource[]) {
    for (const modelResource of modelResources) {
      ux.stdout('')
      hux.styledHeader(modelResource.model_id)
      hux.styledObject({
        'Base Model ID': modelResource.model_id,
        'Model Alias': modelResource.model_alias,
        'Model Resource ID': modelResource.model_resource_id,
        Ready: modelResource.ready,
        'Avg Performance': modelResource.avg_performance,
      })
    }
  }
}
