import {flags} from '@heroku-cli/command'
import {color} from '@heroku/heroku-cli-util'
import {Args} from '@oclif/core'
import {ux} from '@oclif/core/ux'
import tsheredoc from 'tsheredoc'
import createAddon from '../../../lib/ai/models/create_addon.js'
import {handlePlatformApiErrors} from '../../../lib/ai/models/util.js'
import Command from '../../../lib/base.js'

const heredoc = tsheredoc.default ?? tsheredoc

export default class Create extends Command {
  static args = {
    model_name: Args.string({
      description: 'name of AI model to provision access for',
      required: true,
    }),
  }

  static description = 'provision access to an AI model '

  static example = heredoc`
    # Provision access to an AI model and attach it to your app with a default name:
    heroku ai:models:create claude-3-5-sonnet --app example-app
    # Provision access to an AI model and attach it to your app with a custom name:
    heroku ai:models:create stable-image-ultra --app example-app --as diffusion
  `

  static flags = {
    app: flags.app({
      description: 'name of app to attach model to',
      required: true,
    }),
    as: flags.string({description: 'alias of model resource '}),
    confirm: flags.string({description: 'overwrite existing config vars or existing add-on aliases '}),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Create)
    const {app, as, confirm} = flags
    const {model_name: modelName} = args

    try {
      const addon = await createAddon(
        this.heroku,
        app,
        `${this.addonServiceSlug}:${modelName}`,
        confirm,
        {config: {}, as}
      )

      await this.config.runHook('recache', {type: 'addon', app, addon})
      ux.stdout(`Use ${color.command('heroku ai:docs')} to view documentation.`)
    } catch (error: unknown) {
      handlePlatformApiErrors(error, {as, modelName})
    }
  }
}
