import {color} from '@heroku-cli/color'
import {APIClient, Command} from '@heroku-cli/command'
import * as Heroku from '@heroku-cli/schema'
import {ux} from '@oclif/core'
import heredoc from 'tsheredoc'
import {HerokuAPIError} from '@heroku-cli/command/lib/api-client'

export class NotFound extends Error {
  constructor(addonIdentifier: string, appIdentifier?: string) {
    const message = heredoc`
      We can’t find a model resource called ${color.yellow(addonIdentifier)}${appIdentifier ? ` on ${color.app(appIdentifier)}` : ''}.
      Run ${color.cmd(`heroku ai:models:info --app ${appIdentifier ? appIdentifier : '<value>'}`)} to see a list of model resources.
    `
    super(message)
  }

  public readonly statusCode = 404
  public readonly id = 'not_found'
}

export class AppNotFound extends Error {
  constructor(appIdentifier?: string) {
    const message = heredoc`
      We can’t find the ${color.app(appIdentifier)} app. Check your spelling.
    `
    super(message)
  }

  public readonly statusCode = 404
  public readonly id = 'not_found'
}

export class AmbiguousError extends Error {
  constructor(public readonly matches: string[], addonIdentifier: string, appIdentifier?: string) {
    const message = heredoc`
      Multiple model resources match ${color.yellow(addonIdentifier)}${appIdentifier ? ` on ${color.app(appIdentifier)}` : ''}: ${matches.map(match => color.addon(match)).join(', ')}.
      Specify the model resource by its name instead.
    `
    super(message)
  }

  public readonly statusCode = 422
  public readonly id = 'multiple_matches'
}

export default abstract class extends Command {
  private _addon?: Required<Heroku.AddOn>
  private _addonAttachment?: Required<Heroku.AddOnAttachment>
  private _addonServiceSlug?: string
  private _apiKey?: string
  private _apiModelId?: string
  private _apiUrl?: string
  private _herokuAI?: APIClient
  private _defaultInferenceHost: string = process.env.HEROKU_INFERENCE_HOST || 'inference.heroku.com'

  protected async configureHerokuAIClient(addonIdentifier?: string, appIdentifier?: string): Promise<void> {
    this._herokuAI = new APIClient(this.config)

    const defaultHeaders = {
      ...this.heroku.defaults.headers,
      accept: 'application/json',
      'user-agent': `heroku-cli-plugin-ai/${process.env.npm_package_version} ${this.config.platform}`,
    }
    delete defaultHeaders.authorization

    if (addonIdentifier) {
      ({addon: this._addon, attachment: this._addonAttachment} = await this.resolveAddonAndAttachment(addonIdentifier, appIdentifier))

      const {body: configVars} = await this.heroku.get<Heroku.ConfigVars>(`/apps/${this.addonAttachment.app.id}/config-vars`)

      this._apiKey = configVars[this.apiKeyConfigVarName]
      this._apiModelId = configVars[this.apiModelIdConfigVarName] ||
        this.addon.plan.name?.split(':')[1] // Fallback to plan name (e.g. "inference:claude-3-haiku" => "claude-3-haiku"
      this._apiUrl = configVars[this.apiUrlConfigVarName]
      this._addonServiceSlug = this.addon.addon_service.name
      this._herokuAI.defaults.host = this.apiUrl
      this._herokuAI.defaults.headers = {
        ...defaultHeaders,
        authorization: `Bearer ${this.apiKey}`,
      }
    } else {
      this._herokuAI.defaults.host = this.defaultInferenceHost
      this._herokuAI.defaults.headers = defaultHeaders
    }
  }

  /*
   * Resolution logic:
   * 1. Use the add-on and app identifiers to fetch matching add-ons and attachments from Platform API
   *    resolver endpoints.
   * 2. If we don't get any add-ons or add-on attachments from the resolvers, we throw a NotFound error.
   * 3. Try to resolve the add-on through the add-ons resolver response:
   *    a. If we have no add-ons, we move to the next step.
   *    b. We deduplicate the resolved add-ons based on their add-on ids.
   *    c. If we're left with a single add-on, it will be the selected one.
   *    d. If we still have multiple add-ons, we throw an AmbiguousError.
   * 4. If we didn't resolve for an add-on yet, try to do it through the add-on attachments resolver response:
   *    a. If we have a single attachment, we select it as the resolved attachment and try to resolve the
   *       add-on fetching its info using the app and add-on ids from the attachment.
   *    b. If we have multiple attachments, we deduplicate attachments to the same app and filter
   *       based on add-ons that are accessible to the user through the attached app (we do this
   *       fetching all add-ons using the app and add-on ids from the remaining attachments and keeping
   *       only the successful responses).
   *       - If we're left with no accessible add-ons, we throw a NotFound error.
   *       - If we still have multiple attachments, we throw an AmbiguousError.
   *       - If we get a single accessible add-on, we select it as the resolved add-on and its associated
   *         attachment as the resolved attachment.
   * 5. If we resolved for an add-on, check that it's a Managed Inference add-on or throw a NotFound error.
   * 6. If we resolved for an add-on but not yet for an attachment:
   *    a. If we have a single attachment on the resolver response, we select that one.
   *    b. If not, we try to select the first attachment that matches the resolved add-on by app and add-on id.
   *    c. If no attachment matched, we fetch all add-on attachments for the resolved add-on and try to
   *       select the first one that matches the resolved add-on by app id.
   * 7. If we get to this point without the add-on or the attachment resolved, throw a NotFound error.
   * 8. Return the resolved add-on and attachment.
   */
  // eslint-disable-next-line complexity
  private async resolveAddonAndAttachment(addonIdentifier: string, appIdentifier?: string) {
    let resolvedAddon: Required<Heroku.AddOn> | undefined
    let resolvedAttachment: Required<Heroku.AddOnAttachment> | undefined

    // 1. Use the add-on and app identifiers to fetch matching add-ons and attachments from Platform API
    //    resolver endpoints.
    const addonResolverRequest = this.heroku.post<Array<Required<Heroku.AddOn>>>('/actions/addons/resolve', {
      body: {
        addon: addonIdentifier,
        app: appIdentifier || null,
      },
    })
    const attachmentResolverRequest = this.heroku.post<Array<Required<Heroku.AddOnAttachment>>>('/actions/addon-attachments/resolve', {
      body: {
        addon_attachment: addonIdentifier,
        app: appIdentifier || null,
      },
    })

    const [settledAddons, settledAttachments] = await Promise.allSettled([addonResolverRequest, attachmentResolverRequest])

    if (settledAddons.status === 'rejected' && settledAttachments.status === 'rejected') {
      // 2. If we don't get any add-ons or add-on attachments from the resolvers, we throw a NotFound error.
      this.handleErrors(settledAddons, settledAttachments, addonIdentifier, appIdentifier)
    }

    const resolvedAddons = settledAddons.status === 'fulfilled' ? settledAddons.value.body : []
    const resolvedAttachments = settledAttachments.status === 'fulfilled' ? settledAttachments.value.body : []

    // 3. Try to resolve the add-on through the add-ons resolver response.
    if (resolvedAddons.length > 0) {
      // The add-on resolver may duplicate add-ons when there's more than one attachment and the user has access to the different
      // apps where it's attached, so we dedup here trying to get a single result.
      const uniqueAddons = resolvedAddons.filter((addon, index, self) => {
        return self.findIndex(a => a.id === addon.id) === index
      })

      if (uniqueAddons.length === 1)
        resolvedAddon = uniqueAddons[0]
      else
        throw new AmbiguousError(uniqueAddons.map(a => a.name), addonIdentifier, appIdentifier)
    }

    // 4. If we didn't resolve for an add-on yet, try to do it through the add-on attachments resolver response.
    if (!resolvedAddon) {
      if (resolvedAttachments.length === 1) {
        resolvedAttachment = resolvedAttachments[0];
        ({body: resolvedAddon} = await this.heroku.get<Required<Heroku.AddOn>>(`/apps/${resolvedAttachment.app.id}/addons/${resolvedAttachment.addon.id}`))
      } else if (resolvedAttachments.length > 1) {
        const uniqueAppAddons = resolvedAttachments.map(a => {
          return {attachment: a, appId: a.app.id, addonId: a.addon.id}
        }).filter((appAddon, index, self) => {
          return self.findIndex(a => a.appId === appAddon.appId && a.addonId === appAddon.addonId) === index
        })
        const addonRequests = uniqueAppAddons.map(a => this.heroku.get<Required<Heroku.AddOn>>(`/apps/${a.appId}/addons/${a.addonId}`))
        const settledAddons = await Promise.allSettled(addonRequests)
        const accessibleAddons = settledAddons.filter(s => s.status === 'fulfilled').map(s => s.value.body)

        if (accessibleAddons.length === 0)
          throw new NotFound(addonIdentifier, appIdentifier)
        else if (accessibleAddons.length > 1)
          throw new AmbiguousError(accessibleAddons.map(a => a.name), addonIdentifier, appIdentifier)
        else {
          resolvedAddon = accessibleAddons[0]
          resolvedAttachment = uniqueAppAddons[settledAddons.findIndex(s => s.status === 'fulfilled')].attachment
        }
      }
    }

    // 5. If we resolved for an add-on, check that it's a Managed Inference add-on or throw a NotFound error.
    if (resolvedAddon && resolvedAddon.addon_service.name !== this.addonServiceSlug) {
      throw new NotFound(addonIdentifier, appIdentifier)
    }

    // 6. If we resolved for an add-on but not for an attachment yet, try to resolve the attachment
    if (resolvedAddon && !resolvedAttachment) {
      resolvedAttachment = resolvedAttachments.length === 1 ?
        resolvedAttachments[0] :
        resolvedAttachments.find(a => a.addon.id === resolvedAddon.id && a.app.id === resolvedAddon.app.id)

      if (!resolvedAttachment) {
        const {body: addonAttachments} = await this.heroku.get<Array<Required<Heroku.AddOnAttachment>>>(`/addons/${resolvedAddon.id}/addon-attachments`)
        resolvedAttachment = addonAttachments.find(a => a.app.id === resolvedAddon.app.id)
      }
    }

    // 7. If we get to this point without the add-on or the attachment resolved, throw a NotFound error.
    if (!resolvedAddon || !resolvedAttachment)
      throw new NotFound(addonIdentifier, appIdentifier)

    // 8. Return the resolved add-on and attachment.
    return {addon: resolvedAddon, attachment: resolvedAttachment}
  }

  private handleErrors(
    addonRejection: PromiseRejectedResult,
    attachmentRejection: PromiseRejectedResult,
    addonIdentifier: string,
    appIdentifier?: string
  ): never {
    const addonResolverError = addonRejection.reason
    const attachmentResolverError = attachmentRejection.reason
    const addonNotFound = addonResolverError instanceof HerokuAPIError &&
      addonResolverError.http.statusCode === 404 &&
      addonResolverError.body.resource === 'add_on'
    const attachmentNotFound = attachmentResolverError instanceof HerokuAPIError &&
      attachmentResolverError.http.statusCode === 404 &&
      attachmentResolverError.body.resource === 'add_on attachment'
    const appNotFound = attachmentResolverError instanceof HerokuAPIError &&
      attachmentResolverError.http.statusCode === 404 &&
      attachmentResolverError.body.resource === 'app'
    let error = addonResolverError

    if (addonNotFound)
      error = attachmentNotFound ? new NotFound(addonIdentifier, appIdentifier) : attachmentResolverError

    if (appNotFound)
      error = new AppNotFound(appIdentifier)

    throw error
  }

  get addon(): Required<Heroku.AddOn> {
    if (this._addon)
      return this._addon

    ux.error('Heroku AI API Client not configured.', {exit: 1})
  }

  get addonAttachment(): Required<Heroku.AddOnAttachment> {
    if (this._addonAttachment)
      return this._addonAttachment

    ux.error('Heroku AI API Client not configured.', {exit: 1})
  }

  get addonServiceSlug(): string {
    return this._addonServiceSlug ||
      process.env.HEROKU_INFERENCE_ADDON ||
      'heroku-inference'
  }

  get apiKey(): string {
    if (this.addon && this._apiKey)
      return this._apiKey

    ux.error(`Model resource ${color.addon(this.addon?.name)} isn’t fully provisioned on ${color.app(this.addon?.app.name)}.`, {exit: 1})
  }

  get apiKeyConfigVarName(): string {
    return `${this.addonAttachment.name.toUpperCase()}_KEY`
  }

  get apiModelId(): string | undefined {
    return this._apiModelId
  }

  get apiModelIdConfigVarName(): string {
    return `${this.addonAttachment.name.toUpperCase()}_MODEL_ID`
  }

  get apiUrl(): string {
    if (this.addon && this._apiUrl)
      return this._apiUrl

    ux.error(`Model resource ${color.addon(this.addon?.name)} isn’t fully provisioned on ${color.app(this.addon?.app.name)}.`, {exit: 1})
  }

  get apiUrlConfigVarName(): string {
    return `${this.addonAttachment.name.toUpperCase()}_URL`
  }

  get herokuAI(): APIClient {
    if (this._herokuAI)
      return this._herokuAI

    ux.error('Heroku AI API Client not configured.', {exit: 1})
  }

  get defaultInferenceHost(): string {
    return this._defaultInferenceHost
  }
}
