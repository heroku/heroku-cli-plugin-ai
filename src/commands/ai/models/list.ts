import {ux} from '@oclif/core/ux'
import {hux} from '@heroku/heroku-cli-util'
import type {ModelList} from '@heroku/ai'
import Command from '../../../lib/base.js'

const displayModels = (models: ModelList) => {
  ux.stdout('')
  hux.table(models as unknown as Record<string, unknown>[], {
    model_id: {header: 'Model'},
    type: {header: 'Type', get: (row: any) => row.type.join(', ')},
    regions: {header: 'Supported regions', get: (row: any) => row.regions.join(', ')},
  })
}

export default class List extends Command {
  static aliases: string[] = ['ai:models']

  static description = 'list available AI models to provision access to '

  static examples = [
    '$ heroku ai:models:list',
  ]

  public async run(): Promise<void> {
    await this.configureHerokuAIClient()

    const herokuAIClient = this.herokuAI
    const urlPath = '/available-models'

    const {body: availableModels} = await herokuAIClient.get<ModelList>(urlPath)

    displayModels(availableModels)
    ux.stdout('\nSee https://devcenter.heroku.com/articles/heroku-inference-api-model-cards for more info. ')
  }
}
