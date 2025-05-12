import {flags} from '@heroku-cli/command'
import {openUrl} from '../../lib/open-url'
import Command from '../../lib/base'

export default class Docs extends Command {
  static defaultUrl = 'https://devcenter.heroku.com/articles/heroku-inference-cli-commands'
  static description = 'opens docs for Heroku AI in your web browser '
  static flags = {
    browser: flags.string({description: 'browser to open docs with (example: "firefox", "safari") '}),
  }

  public async run(): Promise<void> {
    const {flags} = await this.parse(Docs)
    const browser = flags.browser
    const url = process.env.HEROKU_AI_DOCS_URL || Docs.defaultUrl

    await openUrl(url, browser, 'view the documentation')
  }
}
