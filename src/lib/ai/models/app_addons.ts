import {Config} from '@oclif/core'
import {APIClient} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'

export default async function (config: Config, app: string) {
  const herokuClient = new APIClient(config)

  const {body: response} = await herokuClient.get<Heroku.AddOn>(`/apps/${app}/addons`, {
    headers: {'Accept-Expansion': 'plan'},
  }).catch(error => {
    const error_ = error.body && error.body.message ? new Error(`The add-on was unable to be destroyed: ${error.body.message}. `) : new Error(`The add-on was unable to be destroyed: ${error}. `)
    throw error_
  })

  return response
}
