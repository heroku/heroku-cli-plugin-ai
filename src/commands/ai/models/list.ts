// import color from '@heroku-cli/color'
// import {ux} from '@oclif/core'
import {ModelListItem} from '../../../lib/ai/types'
// import {CLIError} from '@oclif/core/lib/errors'
import Command from '../../../lib/base'

// const displayModels = (models: any) => {
//   // parse and display models from design doc

// }

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

    console.log('available models', availableModels)

    // displayModels(availableModels)
  }
}
