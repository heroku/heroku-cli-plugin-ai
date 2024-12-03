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
    model_card_links: {
      get: ({link}: any) => link,
    },
  }, {'no-header': false})
}

// This is a temporary hardcoding of model cards
// until the AI API can support these links
const modelCardURLs = [
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_claude-3-5-haiku',
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_claude-3-5-sonnet',
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_claude-3-5-sonnet-latest',
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_claude-3-haiku',
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_cohere-embed-multilingual',
  'https://devcenter.heroku.com/articles/heroku-inference_model-cards_stable-image-ultra',
]

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

    // This is a temporary hardcoding of model cards
    // to model names until the AI API can support these links
    for (const [index, availableModel] of availableModels.entries()) {
      availableModel.link = modelCardURLs[index]
    }

    displayModels(availableModels)
    ux.log('\nSee https://devcenter.heroku.com/articles/heroku-inference_model-cards for more info.')
  }
}
