import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import heredoc from 'tsheredoc'
import createAddon from '../../../lib/ai/models/create_addon'
import Command from '../../../lib/base'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client'

export default class Create extends Command {
  static args = {
    model_name: Args.string({
      description: 'The name of the model to provision access for',
      required: true,
    }),
  }

  static description = 'provisions access to an AI model'
  static example = heredoc`
    # Provision access to an AI model and attach it to your app with a default name:
    $ heroku ai:models:create claude-3-5-sonnet --app example-app
    # Provision access to an AI model and attach it to your app with a custom name:
    $ heroku ai:models:create stable-diffusion-xl --app example-app --as my_sdxl
  `
  static flags = {
    app: flags.app({
      description: 'The name of the Heroku app to attach the model to',
      required: true,
    }),
    as: flags.string({description: 'alias name for model resource'}),
    confirm: flags.string({description: 'overwrite existing config vars or existing add-on attachments'}),
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
      ux.log(`Use ${color.cmd('heroku ai:docs to view documentation')}.`)
    } catch (error: unknown) {
      this.handleError(error, {as, modelName})
    }
  }

  /**
   * Error handler
   * @param error Error thrown when attempting to create the add-on.
   * @param cmdContext Context of the command that failed.
   * @returns never
   *
   * There's a problem with this error handler implementation, because it relies on the specific error message
   * returned from API in order to format the error correctly. This is prone to fail if changes are introduced
   * upstream on error messages. We should rely on the error `id` but API returns a generic `invalid_params`.
   */
  private handleError(error: unknown, cmdContext: {as?: string, modelName?: string} = {}): never {
    if (error instanceof HerokuAPIError && error.body.id === 'invalid_params') {
      if (error.body.message?.includes('start with a letter')) {
        ux.error(
          `${cmdContext.as} is an invalid alias name. It must start with a letter and can only contain uppercase letters, numbers, and underscores.`,
          {exit: 1},
        )
      }

      if (error.body.message?.includes('add-on plan')) {
        ux.error(
          `${cmdContext.modelName} is an invalid model name. Run ${color.cmd('heroku ai:models:list')} for a list of valid models.`,
          {exit: 1},
        )
      }
    }

    throw error
  }
}
