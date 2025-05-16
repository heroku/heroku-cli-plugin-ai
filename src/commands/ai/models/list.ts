import {ux} from '@oclif/core'
import type {ModelList} from '@heroku/ai'
import Command from '../../../lib/base'

const displayModels = (models: ModelList) => {
  ux.log()
  ux.table(models, {
    model: {
      get: ({model_id}: any) => model_id,
    },
    type: {
      get: ({type}: any) => type.join(', '),
    },
    supported_regions: {
      get: ({regions}: any) => regions.join(', '),
    },
  }, {'no-header': false})
}

export default class List extends Command {
  static description = 'list available AI models to provision access to '

  static examples = [
    '$ heroku ai:models:list',
  ]

  static aliases: string[] = ['ai:models']

  public async run(): Promise<void> {
    await this.configureHerokuAIClient()

    const herokuAIClient = this.herokuAI
    const urlPath = '/available-models'

    const {body: availableModels} = await herokuAIClient.get<ModelList>(urlPath)

    displayModels(availableModels)
    ux.log('\nSee https://devcenter.heroku.com/articles/heroku-inference-api-model-cards for more info. ')
  }
}
