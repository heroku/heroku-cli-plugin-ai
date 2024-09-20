@heroku-cli/plugin-ai
=====================

Heroku AI CLI plugin


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@heroku-cli/plugin-ai.svg)](https://npmjs.org/package/@heroku-cli/plugin-ai)
[![Downloads/week](https://img.shields.io/npm/dw/@heroku-cli/plugin-ai.svg)](https://npmjs.org/package/@heroku-cli/plugin-ai)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
```sh-session
$ heroku plugins:install @heroku-cli/plugin-ai
$ heroku ai:COMMAND
running command...
$ heroku ai --help [COMMAND]
USAGE
  $ heroku ai:COMMAND
...
```
# Commands
<!-- commands -->
* [`heroku ai:docs`](#heroku-aidocs)
* [`heroku ai:models`](#heroku-aimodels)
* [`heroku ai:models:info [INSTANCE]`](#heroku-aimodelsinfo-instance)
* [`heroku ai:models:list`](#heroku-aimodelslist)

## `heroku ai:docs`

Opens documentation for Heroku AI in your web browser.

```
USAGE
  $ heroku ai:docs [--browser <value>]

FLAGS
  --browser=<value>  browser to open docs with (example: "firefox", "safari")

DESCRIPTION
  Opens documentation for Heroku AI in your web browser.
```

_See code: [dist/commands/ai/docs.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/docs.ts)_

## `heroku ai:models`

list available AI models to provision access to

```
USAGE
  $ heroku ai:models

DESCRIPTION
  list available AI models to provision access to

ALIASES
  $ heroku ai:models

EXAMPLES
  $ heroku ai:models:list
```

## `heroku ai:models:info [INSTANCE]`

get the current status of all the AI model instances attached to your app or a specific instance

```
USAGE
  $ heroku ai:models:info [INSTANCE] -a <value> [-r <value>]

ARGUMENTS
  INSTANCE  the resource ID or alias of the model instance to check

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

DESCRIPTION
  get the current status of all the AI model instances attached to your app or a specific instance

EXAMPLES
  $ heroku ai:models:info claude-3-5-sonnet-acute-04281 --app example-app

  $ heroku ai:models:info --app example-app
```

_See code: [dist/commands/ai/models/info.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/info.ts)_

## `heroku ai:models:list`

list available AI models to provision access to

```
USAGE
  $ heroku ai:models:list

DESCRIPTION
  list available AI models to provision access to

ALIASES
  $ heroku ai:models

EXAMPLES
  $ heroku ai:models:list
```

_See code: [dist/commands/ai/models/list.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/list.ts)_
<!-- commandsstop -->
