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
* [`heroku ai:models:create MODEL_NAME`](#heroku-aimodelscreate-model_name)
* [`heroku ai:models:detach MODEL_RESOURCE`](#heroku-aimodelsdetach-model_resource)
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

## `heroku ai:models:create MODEL_NAME`

provision access to an AI model

```
USAGE
  $ heroku ai:models:create [MODEL_NAME] -a <value> [--as <value>] [--confirm <value>] [-r <value>]

ARGUMENTS
  MODEL_NAME  The name of the model to provision access for

FLAGS
  -a, --app=<value>     (required) The name of the Heroku app to attach the model to
  -r, --remote=<value>  git remote of app to use
  --as=<value>          alias name for model resource
  --confirm=<value>     overwrite existing config vars or existing add-on attachments

DESCRIPTION
  provision access to an AI model

EXAMPLES
  # Provision access to an AI model and attach it to your app with a default name:
  $ heroku ai:models:create claude-3-5-sonnet --app example-app
  # Provision access to an AI model and attach it to your app with a custom name:
  $ heroku ai:models:create stable-diffusion-xl --app example-app --as my_sdxl
```

_See code: [dist/commands/ai/models/create.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/create.ts)_

## `heroku ai:models:detach MODEL_RESOURCE`

Detach a model resource from an app.

```
USAGE
  $ heroku ai:models:detach [MODEL_RESOURCE] -a <value> [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  The resource ID or alias of the model resource to detach

FLAGS
  -a, --app=<value>     (required) [default: k80-ai-test] The name of the Heroku app to detach the model resrouce from.
  -r, --remote=<value>  git remote of app to use

DESCRIPTION
  Detach a model resource from an app.

EXAMPLES
  $ heroku ai:models:detach claude-3-5-sonnet-acute-41518 --app example-app
```

_See code: [dist/commands/ai/models/detach.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/detach.ts)_

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
