import {ux} from '@oclif/core'
import {ModelListItem} from '../../../lib/ai/types'
// import {CLIError} from '@oclif/core/lib/errors'
import Command from '../../../lib/base'

const displayModels = (models: any) => {
  ux.log()

  ux.table(models, {
    model: {
      get: ({model_id}: any) => model_id,
    },
    types: {
      get: ({type}: any) => type.join(', ').replace(/-/g, ' '),
    },
  }, {'no-header': true})
}

export default class List extends Command {
  static description = 'List available AI models to provision access to.'

  static examples = [
    '$ heroku ai:models:list',
  ]

  static aliases: string[] = ['ai:models']

  public async run(): Promise<void> {
    await this.configureHerokuAIClient()

    const herokuAIClient = this.herokuAI
    const urlPath = '/available-models'
    const {body: availableModels} = await herokuAIClient.get<ModelListItem>(urlPath)

    displayModels(availableModels)
    ux.log('\nSee https://devcenter.heroku.com/articles/rainbow-unicorn-princess-models for more info.')
  }
}
