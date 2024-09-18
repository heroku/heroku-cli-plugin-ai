import * as Heroku from '@heroku-cli/schema'

export const availableModels = [
  {
    model_id: 'stable-diffusion-xl',
    type: ['Text-to-image'],
  },
  {
    model_id: 'claude-3-5-sonnet',
    type: ['Text-to-text'],
  },
  {
    model_id: 'claude-3-opus',
    type: ['Text-to-text'],
  },
  {
    model_id: 'claude-3-sonnet',
    type: ['Text-to-text'],
  },
  {
    model_id: 'claude-3-haiku',
    type: ['Text-to-text'],
  },
  {
    model_id: 'cohere-embed-english',
    type: ['Text-to-text', 'Embedding'],
  },
  {
    model_id: 'cohere-embed-multilingual',
    type: ['Text-to-text', 'Embedding'],
  },
]

export const mockAPIErrors = {
  modelsListErrorResponse: {
    id: 'error',
    message: 'Failed to retrieve the list of available models. Check the Heroku Status page https://status.heroku.com/ for system outages. After all incidents have resolved, try again. You can also see a list of models at https://devcenter.heroku.com/articles/rainbow-unicorn-princess-models.',
  },
}

export const addon1: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: 'a5e060e7-be73-4129-a197-c4b9dc8debfd',
  name: 'inference-regular-74659',
  plan: {
    id: '927beee9-dc83-4bcc-b1f7-70c091ece601',
    name: 'inference:claude-3-haiku',
  },
}

export const addon2: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '680f9991-ae7a-484f-ba50-da9f93b8e2fe',
  name: 'inference-shaped-00003',
  plan: {
    id: '717e554c-5098-42a5-8a03-ed7a1675f9f2',
    name: 'inference:claude-3-opus',
  },
}

export const addon3: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'inference',
  },
  app: {
    id: 'aa7ce11f-4e9d-4175-a85f-2440ce66a428',
    name: 'app1',
  },
  id: '1d2694d8-5c4a-4111-82df-aaef739cc3fa',
  name: 'inference-animate-91825',
  plan: {
    id: 'ed27942a-929f-40d4-b145-a09361c53ecf',
    name: 'inference:claude-3-sonnet',
  },
}

export const addon4: Heroku.AddOn = {
  addon_service: {
    id: '4b46be3f-d0e6-4b3f-b616-0a857115d71d',
    name: 'inference',
  },
  app: {
    id: 'd0256f69-a6ea-45ad-93e5-3911eac0d216',
    name: 'app2',
  },
  id: 'd061509d-3f05-4424-9a95-7d169b26022c',
  name: 'inference-crystalline-68941',
  plan: {
    id: '717e554c-5098-42a5-8a03-ed7a1675f9f2',
    name: 'inference:claude-3-opus',
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
