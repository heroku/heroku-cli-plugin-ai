/**
 * API reference doc: https://salesforce.quip.com/xi1fAHQczNbO
 */

/**
 * Model names and types
 */
export type ModelName =
  'stable-diffusion-xl' |
  'claude-3-5-sonnet' |
  'claude-3-opus' |
  'claude-3-sonnet' |
  'claude-3-haiku' |
  'cohere-embed-english' |
  'cohere-embed-multilingual'

export type ModelType = 'Text to Text' | 'Embedding'

/**
 * Object schema for each collection item returned by the Model List endpoint.
 */
export type ModelListItem = {
  name: ModelName
  type: Array<ModelType>
}

/**
 * Collection schema for Model List endpoint responses.
 */
export type ModelList = Array<ModelListItem>

/**
 * Object schema for Model Info endpoint responses.
 */
export type ModelInfo = {
  name: ModelName
  description: string
  link: string
}

/**
 * Object schema for Model Status endpoint responses.
 */
export type ModelInstance = {
  plan: ModelName
  created: string
  tokens_in: string
  tokens_out?: string
  avg_performance: string
}

/**
 * Types returned for `ai:models:call` will be added after the description gets refined in the
 * API reference document.
 */
