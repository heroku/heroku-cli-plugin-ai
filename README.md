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
* [`heroku ai:models:destroy MODEL_RESOURCE`](#heroku-aimodelsdestroy-model_resource)
* [`heroku ai:models:detach MODEL_RESOURCE`](#heroku-aimodelsdetach-model_resource)
* [`heroku ai:models:info MODEL_RESOURCE`](#heroku-aimodelsinfo-model_resource)
* [`heroku ai:models:list`](#heroku-aimodelslist)

## `heroku ai:docs`

opens docs for Heroku AI in your web browser

```
USAGE
  $ heroku ai:docs [--browser <value>]

FLAGS
  --browser=<value>  browser to open docs with (example: "firefox", "safari")

DESCRIPTION
  opens docs for Heroku AI in your web browser
```

_See code: [dist/commands/ai/docs.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/docs.ts)_

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
  $ heroku ai:models:attach [MODEL_RESOURCE] -s <value> -t <value> [--as <value>] [--confirm <value>] [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  resource ID or alias of the model resource to attach

FLAGS
  -r, --remote=<value>      git remote of target app
  -s, --source-app=<value>  (required) source app for model resource
  -t, --target-app=<value>  (required) target app for model resource
  --as=<value>              alias name for model resource
  --confirm=<value>         overwrite existing attached resource with same name

DESCRIPTION
  attach an existing model resource to an app

EXAMPLES
  $ heroku ai:models:attach claude-3-5-sonnet-acute-41518 --source-app example-source-app --target-app example-target-app

  $ heroku ai:models:attach claude-3-5-sonnet-acute-41518 --source-app example-source-app --target-app example-target-app --as MY_CS35
```

_See code: [dist/commands/ai/models/attach.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/attach.ts)_

## `heroku ai:models:call MODEL_RESOURCE`

make an inference request to a specific AI model resource

```
USAGE
  $ heroku ai:models:call [MODEL_RESOURCE] -p <value> [-a <value>] [-j] [--optfile <value>] [--opts <value>] [-o
    <value>] [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  resource ID or alias of the model (the --app flag must be included if an alias is used)

FLAGS
  -a, --app=<value>     name or ID of the app (this flag is required if an alias is used for the MODEL_RESOURCE
                        argument)
  -j, --json            output response as JSON
  -o, --output=<value>  the file path where the command writes the model response
  -p, --prompt=<value>  (required) the input prompt for the model
  -r, --remote=<value>  git remote of app to use
  --optfile=<value>     additional options for model inference, provided as a JSON config file
  --opts=<value>        additional options for model inference, provided as a JSON string

DESCRIPTION
  make an inference request to a specific AI model resource

EXAMPLES
  $ heroku ai:models:call my_llm --app my-app --prompt "What is the meaning of life?"

  $ heroku ai:models:call diffusion --app my-app --prompt "Generate an image of a sunset" --opts '{"quality":"hd"}' -o sunset.png
```

_See code: [dist/commands/ai/models/call.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/call.ts)_

## `heroku ai:models:create MODEL_NAME`

provision access to an AI model

```
USAGE
  $ heroku ai:models:create [MODEL_NAME] -a <value> [--as <value>] [--confirm <value>] [-r <value>]

ARGUMENTS
  MODEL_NAME  name of the AI model to provision access for

FLAGS
  -a, --app=<value>     (required) name of the app to attach the model to
  -r, --remote=<value>  git remote of app to use
  --as=<value>          alias of model resource
  --confirm=<value>     overwrite existing config vars or existing add-on aliases

DESCRIPTION
  provision access to an AI model

EXAMPLES
  # Provision access to an AI model and attach it to your app with a default name:
  $ heroku ai:models:create claude-3-5-sonnet --app example-app
  # Provision access to an AI model and attach it to your app with a custom name:
  $ heroku ai:models:create stable-image-ultra --app example-app --as diffusion
```

_See code: [dist/commands/ai/models/create.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/create.ts)_

## `heroku ai:models:destroy MODEL_RESOURCE`

destroy an existing AI model resource

```
USAGE
  $ heroku ai:models:destroy [MODEL_RESOURCE] -a <value> [-c <value>] [-f] [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  resource ID or alias of the model resource to destroy

FLAGS
  -a, --app=<value>      (required) app to run command against
  -c, --confirm=<value>  set to app name to bypass confirm prompt
  -f, --force            allow destruction even if connected to other apps
  -r, --remote=<value>   git remote of app to use

DESCRIPTION
  destroy an existing AI model resource

EXAMPLES
  $ heroku ai:models:destroy claude-3-5-sonnet-acute-43973
```

_See code: [dist/commands/ai/models/destroy.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/destroy.ts)_

## `heroku ai:models:detach MODEL_RESOURCE`

detach a model resource from an app

```
USAGE
  $ heroku ai:models:detach [MODEL_RESOURCE] -a <value> [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  alias of the model resource to detach

FLAGS
  -a, --app=<value>     (required) name of the app to detach the model resource from
  -r, --remote=<value>  git remote of app to use

DESCRIPTION
  detach a model resource from an app

EXAMPLES
  $ heroku ai:models:detach EXAMPLE_MODEL_ALIAS --app example-app
```

_See code: [dist/commands/ai/models/detach.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/detach.ts)_

## `heroku ai:models:info MODEL_RESOURCE`

get the current status of an AI model resource attached to your app

```
USAGE
  $ heroku ai:models:info [MODEL_RESOURCE] -a <value> [-r <value>]

ARGUMENTS
  MODEL_RESOURCE  resource ID or alias of the model resource

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

DESCRIPTION
  get the current status of an AI model resource attached to your app

EXAMPLES
  $ heroku ai:models:info claude-3-5-sonnet-acute-04281 --app example-app
```

_See code: [dist/commands/ai/models/info.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/info.ts)_

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

_See code: [dist/commands/ai/models/list.ts](https://github.com/heroku/heroku-cli-plugin-ai/blob/v0.0.8/dist/commands/ai/models/list.ts)_
<!-- commandsstop -->
