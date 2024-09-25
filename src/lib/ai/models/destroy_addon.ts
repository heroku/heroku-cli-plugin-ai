import color from '@heroku-cli/color'
import {ux} from '@oclif/core'
import {Config} from '@oclif/core'
import {APIClient} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'

export default async function (config: Config, addon: Heroku.AddOn, force = false) {
  const addonName = addon.name || ''
  const herokuClient = new APIClient(config)

  ux.action.start(`Destroying ${color.addon(addonName)} in the background.\nThe app will restart when complete...`)

  await herokuClient.delete<Heroku.AddOn>(`/apps/${addon.app?.id}/addons/${addon.id}`, {
    headers: {'Accept-Expansion': 'plan'},
    body: {force},
  }).catch(error => {
    const error_ = error.body && error.body.message ? new Error(`The add-on was unable to be destroyed: ${error.body.message}.`) : new Error(`The add-on was unable to be destroyed: ${error}.`)
    throw error_
  })

  ux.action.stop()
}
