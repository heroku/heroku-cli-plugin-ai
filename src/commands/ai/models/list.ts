import {ux} from '@oclif/core'
import {ModelList} from '../../../lib/ai/types'
import Command from '../../../lib/base'

const displayModels = (models: ModelList) => {
  ux.log()
  ux.table(models, {
    model: {
      get: ({model_id}: any) => model_id,
    },
    types: {
      get: ({type}: any) => type.join(', '),
    },
  }, {'no-header': true})
}

export default class List extends Command {
  static description = 'list available AI models to provision access to'

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
    ux.log('\nSee https://devcenter.heroku.com/articles/heroku-inference_model-cards for more info.')
  }
}
