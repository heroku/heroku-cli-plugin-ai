import {Config} from '@oclif/core'
import {APIClient} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'

export default async function (config: Config, app: string) {
  const herokuClient = new APIClient(config)

  const {body: response} = await herokuClient.get<Heroku.AddOn>(`/apps/${app}/addons`, {
    headers: {'Accept-Expansion': 'plan'},
  }).catch(error => {
    const error_ = error.body && error.body.message ?
      new Error(`Unable to retrieve add-ons: ${error.body.message}`) :
      new Error(`Unable to retrieve add-ons: ${error}`)
    throw error_
  })

  return response
}
