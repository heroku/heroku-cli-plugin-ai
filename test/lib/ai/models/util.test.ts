import {expect} from 'chai'
import {formatPrice, formatPriceText, formatState, grandfatheredPrice, handlePlatformApiErrors, trapConfirmationRequired} from '../../../../src/lib/ai/models/util.js'
import stripAnsi from '../../../helpers/strip-ansi.js'

async function resolvedFn(confirmed?: string) {
  return `result-${confirmed}`
}

async function throwingFn(): Promise<never> {
  throw new Error('some other error')
}

describe('ai/models/util', function () {
  describe('formatPrice', function () {
    it('returns undefined when price is falsy', function () {
      expect(formatPrice({price: undefined})).to.be.undefined
    })

    it('returns "contract" for contract pricing', function () {
      expect(formatPrice({price: {cents: 0, unit: 'month', contract: true}})).to.equal('contract')
    })

    it('returns "free" for zero-cent pricing', function () {
      expect(formatPrice({price: {cents: 0, unit: 'month'}})).to.equal('free')
    })

    it('formats monthly price correctly', function () {
      expect(formatPrice({price: {cents: 5000, unit: 'month'}})).to.equal('$50/month')
    })

    it('formats monthly price with cents correctly', function () {
      expect(formatPrice({price: {cents: 5050, unit: 'month'}})).to.equal('$50.50/month')
    })

    it('formats hourly price correctly', function () {
      const result = formatPrice({price: {cents: 5000, unit: 'month'}, hourly: true})
      expect(result).to.match(/~\$\d+\.\d+\/hour/)
    })
  })

  describe('formatPriceText', function () {
    it('returns empty string for undefined price', function () {
      expect(formatPriceText(undefined)).to.equal('')
    })

    it('returns "free" in green for free pricing', function () {
      const result = stripAnsi(formatPriceText({cents: 0, unit: 'month'}))
      expect(result).to.equal('free')
    })

    it('returns "contract" in green for contract pricing', function () {
      const result = stripAnsi(formatPriceText({cents: 0, unit: 'month', contract: true}))
      expect(result).to.equal('contract')
    })

    it('returns hourly and monthly price for paid plans', function () {
      const result = stripAnsi(formatPriceText({cents: 5000, unit: 'month'}))
      expect(result).to.contain('/hour')
      expect(result).to.contain('$50/month')
    })
  })

  describe('grandfatheredPrice', function () {
    it('merges billed_price into plan price', function () {
      const addon = {
        billed_price: {cents: 3000, contract: false},
        plan: {price: {cents: 5000, unit: 'month'}},
      }

      const result = grandfatheredPrice(addon)
      expect(result.cents).to.equal(3000)
      expect(result.contract).to.equal(false)
      expect(result.unit).to.equal('month')
    })
  })

  describe('trapConfirmationRequired', function () {
    it('calls fn with confirm value', async function () {
      const result = await trapConfirmationRequired('myapp', 'myapp', resolvedFn)
      expect(result).to.equal('result-myapp')
    })

    it('calls fn without confirm when not provided', async function () {
      const result = await trapConfirmationRequired('myapp', undefined, resolvedFn)
      expect(result).to.equal('result-undefined')
    })

    it('re-throws non-confirmation errors', async function () {
      try {
        await trapConfirmationRequired('myapp', undefined, throwingFn)
        expect.fail('should have thrown')
      } catch (error: unknown) {
        expect((error as Error).message).to.equal('some other error')
      }
    })
  })

  describe('handlePlatformApiErrors', function () {
    it('re-throws non-HerokuAPIError errors', function () {
      try {
        handlePlatformApiErrors(new Error('generic error'))
        expect.fail('should have thrown')
      } catch (error: unknown) {
        expect((error as Error).message).to.equal('generic error')
      }
    })
  })

  describe('formatState', function () {
    it('converts provisioned to created', function () {
      expect(formatState('provisioned')).to.equal('created')
    })

    it('converts provisioning to creating', function () {
      expect(formatState('provisioning')).to.equal('creating')
    })

    it('converts deprovisioning to destroying', function () {
      expect(formatState('deprovisioning')).to.equal('destroying')
    })

    it('converts deprovisioned to errored', function () {
      expect(formatState('deprovisioned')).to.equal('errored')
    })

    it('returns empty string for unknown state', function () {
      expect(formatState('unknown')).to.equal('')
    })
  })
})
