import {ux} from '@oclif/core'
import color from '@heroku-cli/color'
import * as Heroku from '@heroku-cli/schema'
import {APIClient} from '@heroku-cli/command'
import * as util from './util'

function formatConfigVarsMessage(addon: Required<Heroku.AddOn>) {
  const configVars = addon.config_vars
  let message = `Created ${color.addon(addon.name)}`

  if (configVars.length > 0)
    message += ` as ${configVars.map((c: string) => color.configVar(c)).join(', ')}`

  return message
}

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
      headers: {'accept-expansion': 'plan'},
    }).catch(error => {
      ux.action.stop('')
      throw error
    })

    ux.action.stop(color.green(util.formatPriceText(addon.plan?.price || '')))

    return addon
  }

  const addon = await util.trapConfirmationRequired<Required<Heroku.AddOn>>(app, confirm, confirm => (createAddonRequest(confirm)))

  if (addon.provision_message) {
    ux.log(addon.provision_message)
  }

  ux.log(formatConfigVarsMessage(addon))

  return addon
}
