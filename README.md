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
* [`heroku ai:models:attach MODEL_RESOURCE`](#heroku-aimodelsattach-model_resource)
* [`heroku ai:models:call MODEL_RESOURCE`](#heroku-aimodelscall-model_resource)
* [`heroku ai:models:create MODEL_NAME`](#heroku-aimodelscreate-model_name)
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

## `heroku ai:models:attach MODEL_RESOURCE`

attach an existing model resource to an app

```
USAGE
  $ heroku ai:models:attach [MODEL_RESOURCE] -a <value> [--as <value>] [--confirm <value>] [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  The resource ID or alias of the model resource to attach.

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use
  --as=<value>          alias name for model resource
  --confirm=<value>     overwrite existing resource with same name

DESCRIPTION
  attach an existing model resource to an app

EXAMPLES
  $ heroku ai:models:attach claude-3-5-sonnet-acute-41518 --app example-app

  $ heroku ai:models:attach claude-3-5-sonnet-acute-41518 --app example-app --as MY_CS35
```

_See code: [dist/commands/ai/models/attach.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/attach.ts)_

## `heroku ai:models:call MODEL_RESOURCE`

make an inference request to a specific AI model resource

```
USAGE
  $ heroku ai:models:call [MODEL_RESOURCE] -a <value> -p <value> [-j] [--optfile <value>] [--opts <value>] [-o
    <value>] [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  The resource ID or alias of the model to call.

FLAGS
  -a, --app=<value>     (required) app to run command against
  -j, --json            Output response as JSON
  -o, --output=<value>  The file path where the command writes the model response.
  -p, --prompt=<value>  (required) The input prompt for the model.
  -r, --remote=<value>  git remote of app to use
  --optfile=<value>     Additional options for model inference, provided as a JSON config file.
  --opts=<value>        Additional options for model inference, provided as a JSON string.

DESCRIPTION
  make an inference request to a specific AI model resource

EXAMPLES
  $ heroku ai:models:call my_llm --prompt "What is the meaning of life?"

  $ heroku ai:models:call sdxl --prompt "Generate an image of a sunset" --opts '{"quality": "hd"}'
```

_See code: [dist/commands/ai/models/call.ts](https://github.com/heroku/heroku-cli-plugin-integration/blob/v0.0.0/dist/commands/ai/models/call.ts)_

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
