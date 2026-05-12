import {APIClient} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import * as color from '@heroku/heroku-cli-util/color'
import {ux} from '@oclif/core/ux'
import * as util from './util.js'

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

    ux.action.start(`Creating ${plan} on ${color.app(app)}`)

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
    ux.stdout(addon.provision_message)
  }

  ux.stdout(`Resource name: ${color.green(addon.name)}${options.as ? `\nResource alias: ${color.green(options.as)}` : ''}`)

  ux.stdout(
    `Use ${color.command(`heroku config -a ${addon.app.name}`)} to view model config vars associated with this app.`
  )

  return addon
}
