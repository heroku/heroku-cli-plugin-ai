import {ux} from '@oclif/core'
import color from '@heroku-cli/color'
import * as Heroku from '@heroku-cli/schema'
import {APIClient} from '@heroku-cli/command'
import * as util from './util'

// eslint-disable-next-line max-params
export default async function (
  heroku: APIClient,
  app: string,
  plan: string,
  confirm: string | undefined,
  options: {name?: string, config: Record<string, string | boolean>, as?: string},
) {
  async function createAddonRequest(confirmed?: string) {
    const body = {
      confirm: confirmed,
      name: options.name,
      config: options.config,
      plan: {name: plan},
      attachment: {name: options.as},
    }

    ux.action.start(`Creating ${plan} on ${color.app(app)} `)

    const {body: addon} = await heroku.post<Required<Heroku.AddOn>>(`/apps/${app}/addons`, {
      body,
      headers: {
        'accept-expansion': 'plan',
        'x-heroku-legacy-provider-messages': 'true',
      },
    }).catch(error => {
      ux.action.stop('')
      throw error
    })

    // TODO: This is a hack to show 'metered' as the price text.
    // We should rely on the information returned from the API, but here we use a legacy
    // variant for the add-on serialization and only variant '3.sdk' returns metered pricing.
    // ux.action.stop(color.green(util.formatPriceText(addon.plan?.price || '')))
    ux.action.stop(color.green('metered'))

    return addon
  }

  const addon = await util.trapConfirmationRequired<Required<Heroku.AddOn>>(app, confirm, confirm => (createAddonRequest(confirm)))

  if (addon.provision_message) {
    ux.log(addon.provision_message)
  }

  ux.log(`Resource name: ${color.configVar(addon.name)}${options.as ? `\nResource alias: ${color.configVar(options.as)}` : ''}`)

  ux.log(
    `Run ${color.cmd(`'heroku config -a ${addon.app.name}'`)} to view model config vars associated with this app. `
  )

  return addon
}
