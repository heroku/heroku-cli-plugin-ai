import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import heredoc from 'tsheredoc'
import createAddon from '../../../lib/ai/models/create_addon'
import {handlePlatformApiErrors} from '../../../lib/ai/models/util'
import Command from '../../../lib/base'

export default class Create extends Command {
  static args = {
    model_name: Args.string({
      description: 'name of the model to provision access for',
      required: true,
    }),
  }

  static description = 'provision access to an AI model'
  static example = heredoc`
    # Provision access to an AI model and attach it to your app with a default name:
    heroku ai:models:create claude-3-5-sonnet --app example-app
    # Provision access to an AI model and attach it to your app with a custom name:
    heroku ai:models:create stable-image-ultra --app example-app --as diffusion
  `
  static flags = {
    app: flags.app({
      description: 'name of the Heroku app to attach the model to',
      required: true,
    }),
    as: flags.string({description: 'alias name for model resource'}),
    confirm: flags.string({description: 'overwrite existing config vars or existing add-on aliases'}),
    remote: flags.remote(),
  }

  public async run(): Promise<void> {
    const {flags, args} = await this.parse(Create)
    const {app, as, confirm} = flags
    const {model_name: modelName} = args

    ux.warn(heredoc`
      Heroku Managed Inference and Agent is a pilot or beta service that is subject to the Beta Services Terms at https://www.salesforce.com/company/legal/customer-agreements/ or a written Unified Pilot Agreement if executed by Customer, and the Non-GA Gen AI and Non-GA Credit Consumption terms in the Product Terms Directory at https://ptd.salesforce.com. While use of this pilot or beta service is itself free, such use may consume GA Heroku credits and/or resources for which the Customer may have paid or be charged. Use of this pilot or beta is at the Customer's sole discretion.
      
      For clarity and without limitation, the various third-party machine learning and generative artificial intelligence (AI) models and applications (each a “Platform”) integrated with the Beta Service are Non-SFDC Applications, as that term is defined in the Beta Services Terms. Note that these third-party Platforms include features that use generative AI technology. Due to the nature of generative AI, the output that a Platform generates may be unpredictable, and may include inaccurate or harmful responses. Before using any generative AI output, Customer is solely responsible for reviewing the output for accuracy, safety, and compliance with applicable laws and third-party acceptable use policies. In addition, Customer’s use of each Platform may be subject to the Platform’s own terms and conditions, compliance with which Customer is solely responsible.
    `)

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
      handlePlatformApiErrors(error, {as, modelName})
    }
  }
}
