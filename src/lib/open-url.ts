import color from '@heroku-cli/color'
import {ux} from '@oclif/core'
import {CLIError} from '@oclif/core/lib/errors'
import open from 'open'

export const urlOpener: (...args: Parameters<typeof open>) => ReturnType<typeof open> = open

export async function openUrl(url: string, browser?: string, action?: string) {
  let browserErrorShown = false
  const showBrowserError = (browser?: string) => {
    if (browserErrorShown) return

    ux.warn(`Unable to open ${browser ? browser : 'your default'} browser. Visit ${color.cyan(url)}${action ? ` to ${action}` : ''}.`)
    browserErrorShown = true
  }

  ux.log(`Opening ${color.cyan(url)} in ${browser ? browser : 'your default'} browser… `)

  try {
    await ux.anykey(
      `Press any key to open up the browser${action ? ` to ${action}` : ''}, or ${color.yellow('q')} to exit.`
    )
  } catch (error) {
    const {message, oclif} = error as CLIError
    ux.error(message, {exit: oclif?.exit || 1})
  }

  const cp = await urlOpener(url, {wait: false, ...(browser ? {app: {name: browser}} : {})})
  cp.on('error', (err: Error) => {
    ux.warn(err)
    showBrowserError(browser)
  })
  cp.on('close', (code: number) => {
    if (code !== 0) showBrowserError(browser)
  })
}
