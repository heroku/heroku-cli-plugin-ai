import color from '@heroku-cli/color'
import {flags} from '@heroku-cli/command'
import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors'
import open from 'open'
import Command from '../../lib/base'

export default class Docs extends Command {
  static defaultUrl = 'https://devcenter.heroku.com/articles/ai'
  static description = 'Opens documentation for Heroku AI in your web browser.'
  static flags = {
    browser: flags.string({description: 'browser to open docs with (example: "firefox", "safari")'}),
  }

  static urlOpener: (...args: Parameters<typeof open>) => ReturnType<typeof open> = open

  public async run(): Promise<void> {
    const {flags} = await this.parse(Docs)
    const browser = flags.browser
    const url = process.env.HEROKU_AI_DOCS_URL || Docs.defaultUrl

    let browserErrorShown = false
    const showBrowserError = (browser?: string) => {
      if (browserErrorShown) return

      ux.warn(`Unable to open ${browser ? browser : 'your default'} browser. Please visit ${color.cyan(url)} to view the documentation.`)
      browserErrorShown = true
    }

    ux.log(`Opening ${color.cyan(url)} in ${browser ? browser : 'your default'} browser…`)

    try {
      await ux.anykey(
        `Press any key to open up the browser to show Heroku AI documentation, or ${color.yellow('q')} to exit`
      )
    } catch (error) {
      const {message, oclif} = error as CLIError
      ux.error(message, {exit: oclif?.exit || 1})
    }

    const cp = await Docs.urlOpener(url, {wait: false, ...(browser ? {app: {name: browser}} : {})})
    cp.on('error', (err: Error) => {
      ux.warn(err)
      showBrowserError(browser)
    })
    cp.on('close', (code: number) => {
      if (code !== 0) showBrowserError(browser)
    })
  }
}
