import * as Heroku from '@heroku-cli/schema'
import {ChatCompletionResponse, EmbeddingResponse, ImageResponse, ModelResource} from '../../src/lib/ai/types'

export const availableModels = [
  {
    model_id: 'claude-3-5-sonnet',
    type: ['text-to-text'],
  },
  {
    model_id: 'claude-3-5-sonnet-latest',
    type: ['text-to-text'],
  },
  {
    model_id: 'claude-3-haiku',
    type: ['text-to-text'],
  },
  {
    model_id: 'claude-3-5-haiku',
    type: ['text-to-text'],
  },
  {
    model_id: 'cohere-embed-multilingual',
    type: ['text-to-embedding'],
  },
  {
    model_id: 'stable-image-ultra',
    type: ['text-to-image'],
  },
]

export const mockConfigVars = {
  INFERENCE_KEY: 's3cr3t_k3y',
  INFERENCE_MODEL_ID: 'claude-3-5-sonnet-latest',
  INFERENCE_URL: 'inference-eu.heroku.com',
}

export const mockAPIErrors = {
  modelsListErrorResponse: {
    id: 'error',
    message: 'Failed to retrieve the list of available models. Check the Heroku Status page https://status.heroku.com/ for system outages. After all incidents have resolved, try again. You can also see a list of models at https://devcenter.heroku.com/articles/rainbow-unicorn-princess-models.',
  },
  modelsDestroyErrorResponse: {
    id: 'error',
    message: 'Example API Error',
  },
  modelsInfoErrorResponse: {
    id: 'error',
    message: 'Example API Error',
  },
}

export const modelResource: ModelResource = {
  model_id: 'claude-3-haiku',
  model_alias: 'EXAMPLE_MODEL',
  model_resource_id: 'b46be3d-d0e2-4b3f-b613-0a857115f71f',
  ready: 'Yes',
  created: '2023-01-21T13:02:37.320+00.00',
  tokens_in: '0 tokens this period',
  tokens_out: '0 tokens this period',
  avg_performance: 'latency 0.4sec, 28 tokens/sec',
}

export const addon1: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: 'a5e060e7-be73-4129-a197-c4b9dc8debfd',
  name: 'inference-regular-74659',
  plan: {
    id: '927beee9-dc83-4bcc-b1f7-70c091ece601',
    name: 'heroku-inference:claude-3-haiku',
  },
}

export const addon2: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '680f9991-ae7a-484f-ba50-da9f93b8e2fe',
  name: 'inference-shaped-00003',
  plan: {
    id: '717e554c-5098-42a5-8a03-ed7a1675f9f2',
    name: 'heroku-inference:claude-3-5-sonnet-latest',
  },
}

export const addon3: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '1d2694d8-5c4a-4111-82df-aaef739cc3fa',
  name: 'inference-animate-91825',
  plan: {
    id: 'ed27942a-929f-40d4-b145-a09361c53ecf',
    name: 'heroku-inference:claude-3-5-sonnet-latest',
  },
}

export const addon4: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: 'd061509d-3f05-4424-9a95-7d169b26022c',
  name: 'inference-crystalline-68941',
  plan: {
    id: '717e554c-5098-42a5-8a03-ed7a1675f9f2',
    name: 'heroku-inference:claude-3-5-sonnet-latest',
  },
}

export const addon1Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: 'a5e060e7-be73-4129-a197-c4b9dc8debfd',
    name: 'inference-regular-74659',
    app: {
      id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
      name: 'app1',
    },
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '7ec358c0-2a2f-4beb-8269-6ebfdcffecf6',
  name: 'INFERENCE',
}

export const addon2Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: '680f9991-ae7a-484f-ba50-da9f93b8e2fe',
    name: 'inference-shaped-00003',
    app: {
      id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
      name: 'app1',
    },
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: 'e2a45b3a-ac6e-4b76-b251-9c1ea2f3e3f9',
  name: 'INFERENCE_CYAN',
}

export const addon2Attachment2: Heroku.AddOnAttachment = {
  addon: {
    id: '680f9991-ae7a-484f-ba50-da9f93b8e2fe',
    name: 'inference-shaped-00003',
    app: {
      id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
      name: 'app1',
    },
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '1c047b96-c479-457a-8a44-84960e4d850d',
  name: 'INFERENCE_PINK',
}

export const addon3Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: '1d2694d8-5c4a-4111-82df-aaef739cc3fa',
    name: 'inference-animate-91825',
    app: {
      id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
      name: 'app1',
    },
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '33650d3a-a830-4c71-a2be-3274418d47bb',
  name: 'INFERENCE_MAROON',
}

export const addon3Attachment2: Heroku.AddOnAttachment = {
  addon: {
    id: '1d2694d8-5c4a-4111-82df-aaef739cc3fa',
    name: 'inference-animate-91825',
    app: {
      id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
      name: 'app1',
    },
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: 'a65ba9c0-9bac-45e6-8cf5-d21c95885591',
  name: 'INFERENCE_JADE',
}

export const addon4Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: 'd061509d-3f05-4424-9a95-7d169b26022c',
    name: 'inference-crystalline-68941',
    app: {
      id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
      name: 'app2',
    },
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: '7ee1ae69-9810-4e4e-8c1d-df96af9625a5',
  name: 'INFERENCE',
}

export const addon1Provisioned: Heroku.AddOn = {
  ...addon1,
  config_vars: [
    'INFERENCE_KEY',
    'INFERENCE_MODEL_ID',
    'INFERENCE_URL',
  ],
  plan: {
    id: '927beee9-dc83-4bcc-b1f7-70c091ece601',
    price: {
      cents: 0,
      unit: 'month',
      contract: false,
    },
    name: 'heroku-inference:claude-3-haiku',
  },
  provision_message: 'Heroku AI model resource provisioned successfully',
  state: 'provisioned',
}

export const addon1ProvisionedWithAttachmentName: Heroku.AddOn = {
  ...addon1Provisioned,
  config_vars: [
    'CLAUDE_HAIKU_KEY',
    'CLAUDE_HAIKU_ID',
    'CLAUDE_HAIKU_URL',
  ],
}

export const chatCompletionResponse: ChatCompletionResponse = {
  id: 'chatcmpl-17f8f365f941de720ad38',
  object: 'chat.completion',
  created: 1234567890,
  model: 'claude-3-5-sonnet-latest',
  system_fingerprint: 'heroku-inf-zzuqrd',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: "Hello! I'm an AI assistant created by a company called Anthropic. It's nice to meet you.",
        refusal: null,
      },
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 13,
    completion_tokens: 26,
    total_tokens: 39,
  },
}

export const addon5: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: 'c0addaa4-d2e2-4da4-bf93-c522af6790f9',
  name: 'inference-colorful-79696',
  plan: {
    id: 'de948fb0-48c4-4f47-912d-745817a80f05',
    name: 'heroku-inference:stable-image-ultra',
  },
}

export const addon5Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: 'c0addaa4-d2e2-4da4-bf93-c522af6790f9',
    name: 'inference-colorful-79696',
    app: {
      id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
      name: 'app2',
    },
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: '87f6f66f-8ad3-4787-b895-bc79c2641342',
  name: 'DIFFUSION',
}

export const imageContent = 'Let’s pretend this is an image'
export const imageContentBase64 = 'TGV04oCZcyBwcmV0ZW5kIHRoaXMgaXMgYW4gaW1hZ2U='
export const imageUrl = 'https://example.com/image.png'

export const imageResponseBase64: ImageResponse = {
  created: 1234567890,
  data: [{
    b64_json: imageContentBase64,
    revised_prompt: '',
  }],
}

export const imageResponseUrl: ImageResponse = {
  created: 1234567890,
  data: [{
    url: imageUrl,
    revised_prompt: '',
  }],
}

export const addon6: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'heroku-inference',
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: 'f4be4855-2639-443b-bc96-4080f62da7f2',
  name: 'inference-crystalline-08560',
  plan: {
    id: '808ebff3-813e-425c-812f-3c6c4241b4af',
    name: 'heroku-inference:cohere-embed-multilingual',
  },
}

export const addon6Attachment1: Heroku.AddOnAttachment = {
  addon: {
    id: 'f4be4855-2639-443b-bc96-4080f62da7f2',
    name: 'inference-crystalline-08560',
    app: {
      id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
      name: 'app2',
    },
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: '6156e9ef-3cad-4049-965a-b616a21883f1',
  name: 'EMBEDDINGS',
}

export const embeddingsVector = [
  0.017089844,
  0.029556274,
  -0.047729492,
  0.025772095,
  -0.03060913,
  -0.0309906,
  -0.010574341,
  -0.030792236,
]

export const stringifiedEmbeddingsVector = embeddingsVector.toString()

export const embeddingsResponse: EmbeddingResponse = {
  object: 'list',
  data: [{
    object: 'embeddings',
    index: 0,
    embeddings: embeddingsVector,
  }],
  model: 'cohere-embed-multilingual',
  usage: {
    prompt_tokens: 13,
    completion_tokens: 0,
    total_tokens: 13,
  },
}
