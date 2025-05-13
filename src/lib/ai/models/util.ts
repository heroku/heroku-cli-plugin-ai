/* eslint-disable no-return-await */
import color from '@heroku-cli/color'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client'
import * as Heroku from '@heroku-cli/schema'
import {ux} from '@oclif/core'
import printf from 'printf'
import confirmCommand from '../../confirmCommand'

export const trapConfirmationRequired = async function<T> (app: string, confirm: string | undefined, fn: (confirmed?: string) => Promise<T>) {
  return await fn(confirm)
    .catch(async (error: any) => {
      if (!error.body || error.body.id !== 'confirmation_required')
        throw error
      await confirmCommand(app, confirm, error.body.message)
      return await fn(app)
    })
}

/**
 * Error handler
 * @param error Error thrown when attempting to create the model resource.
 * @param cmdContext Context of the command that failed.
 * @returns never
 *
 * There's a problem with this error handler implementation, because it relies on the specific error message
 * returned from API in order to format the error correctly. This is prone to fail if changes are introduced
 * upstream on error messages. We should rely on the error `id` but API returns a generic `invalid_params`.
 */
export function handlePlatformApiErrors(error: unknown, cmdContext: {as?: string, modelName?: string} = {}): never {
  if (error instanceof HerokuAPIError && error.body.id === 'invalid_params') {
    if (cmdContext.as && error.body.message?.includes('start with a letter')) {
      ux.error(
        `${cmdContext.as} is an invalid alias. Alias must start with a letter and can only contain uppercase letters, numbers, and underscores.`,
        {exit: 1},
      )
    }

    if (cmdContext.modelName && error.body.message?.includes('add-on plan')) {
      ux.error(
        `${cmdContext.modelName} is an invalid model name. Run ${color.cmd('heroku ai:models:list')} for a list of valid models per region. `,
        {exit: 1},
      )
    }
  }

  throw error
}

// This function assumes that price.cents will reflect price per month.
// If the API returns any unit other than month
// this function will need to be updated.
export const formatPrice = function ({price, hourly}: {price: Heroku.AddOn['price'] | number, hourly?: boolean}) {
  if (!price) return
  if (price.contract) return 'contract'
  if (price.cents === 0) return 'free'

  // we are using a standardized 720 hours/month
  if (hourly) return `~$${((price.cents / 100) / 720).toFixed(3)}/hour`

  const fmt = price.cents % 100 === 0 ? '$%.0f/%s' : '$%.02f/%s'
  return printf(fmt, price.cents / 100, price.unit)
}

export const formatPriceText = function (price: Heroku.AddOn['price']) {
  const priceHourly = formatPrice({price, hourly: true})
  const priceMonthly = formatPrice({price, hourly: false})
  if (!priceHourly) return ''
  if (priceHourly === 'free' || priceHourly === 'contract') return `${color.green(priceHourly)}`

  return `${color.green(priceHourly)} (max ${priceMonthly})`
}

export const grandfatheredPrice = function (addon: Heroku.AddOn) {
  const price = addon.plan?.price
  return Object.assign({}, price, {
    cents: addon.billed_price?.cents,
    contract: addon.billed_price?.contract,
  })
}

export const formatState = function (state: string) {
  switch (state) {
  case 'provisioned':
    state = 'created'
    break
  case 'provisioning':
    state = 'creating'
    break
  case 'deprovisioning':
    state = 'destroying'
    break
  case 'deprovisioned':
    state = 'errored'
    break
  default:
    state = ''
  }

  return state
}
