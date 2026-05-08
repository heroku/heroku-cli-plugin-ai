import {color, hux} from '@heroku/heroku-cli-util'
import {ux} from '@oclif/core/ux'
import tsheredoc from 'tsheredoc'

const heredoc = tsheredoc.default ?? tsheredoc

const boldRed = (text: string) => color.ansis.bold.red(text)

export default async function confirmCommand(app: string, confirm?: string | undefined, message?: string) {
  if (confirm) {
    if (confirm === app) return
    throw new Error(`Confirmation ${boldRed(confirm)} did not match ${boldRed(app)}. Aborted.`)
  }

  if (!message) {
    message = heredoc`
      Destructive Action.
      This command will affect the app ${boldRed(app)} .
    `
  }

  ux.warn(message)
  process.stderr.write('\n')
  const entered = await hux.prompt(
    `To proceed, type ${boldRed(app)} or re-run this command with ${boldRed('--confirm ' + app)}.`,
    {required: true},
  )
  if (entered === app) {
    return
  }

  throw new Error(`Confirmation did not match ${boldRed(app)}. Aborted.`)
}
