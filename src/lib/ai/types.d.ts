/**
 * API reference doc: https://salesforce.quip.com/xi1fAHQczNbO
 */

import Command from '@heroku-cli/command'
import {CLIParseErrorOptions, ParserOutput} from '@oclif/core/lib/interfaces/parser'

/**
 * Model names and types
 */
export type ModelName =
  'claude-3-5-sonnet' |
  'claude-3-5-sonnet-latest' |
  'claude-3-haiku' |
  'claude-3-5-haiku' |
  'cohere-embed-multilingual' |
  'stable-image-ultra'

export type ModelType = 'text-to-image' | 'text-to-text' | 'text-to-embedding'

/**
 * Object schema for each collection item returned by the Model List endpoint.
 */
export type ModelListItem = {
  model_id: ModelName
  type: Array<ModelType>
  link: string
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
export type ModelResource = {
  model_id: ModelName
  model_resource_id: string
  model_alias: string
  ready: string
  created: string
  avg_performance: string
}

/**
 * OpenAI compatible response schemas for model calls
 */

/**
 * Tool call schema
 */
export type ToolCall = {
  /** The ID of the tool call. Currently, only function is supported */
  id: string
  /** The type of the tool call */
  type: string
  /** The function that the model called */
  function: {
    /** The name of the function to call */
    name: string
    /** The arguments to call the function with, as generated by the model in JSON format */
    arguments: string
  }
}

/**
 * Log probability token schema
 */
export type LogProbToken = {
  /** The token */
  token: string
  /** The log probability of this token */
  logprob: number
  /** The encoded bytes representing the token */
  bytes: Array<number> | null
}

/**
 * Log probability schema
 */
export type LogProb = LogProbToken & {
  /** List of the most likely tokens and their log probability */
  top_logprobs: Array<LogProbToken> | null
}

/**
 * Chat completion choice schema
 */
export type ChatCompletionChoice = {
  /** The reason the model stopped generating tokens */
  readonly finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls'
  /** The index of the choice in the list of choices */
  readonly index: number
  /** A chat completion message generated by the model */
  readonly message: {
    /** The contents of the message */
    readonly content: string | null
    /** The refusal message generated by the model */
    readonly refusal: string | null
    readonly tool_calls?: Array<ToolCall> | null
    /** The role of the author of this message */
    readonly role: string
  }
  /** Log probability information for the choice */
  readonly logprobs?: {
    /** A list of message content tokens with log probability information */
    content: Array<LogProb> | null
    /** A list of message refusal tokens with log probability information */
    refusal: Array<LogProb> | null
  } | null
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  top_p?: number;
  n?: number;
  stream?: boolean;
  stop?: string | string[];
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  tools?: Tool[];
  tool_choice?: 'none' | 'auto' | ToolChoice;
  user?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface ToolChoice {
  type: 'function';
  function: {
    name: string;
  };
}

/**
 * Chat completion response schema.
 */
export type ChatCompletionResponse = {
  /** A unique identifier for the chat completion */
  readonly id: string
  /** A list of chat completion choices. Can be more than one if n is greater than 1 */
  readonly choices: Array<ChatCompletionChoice>
  /** The Unix timestamp (in seconds) of when the chat completion was created */
  readonly created: number
  /** The model used for the chat completion */
  readonly model: ModelName
  /** The service tier used for processing the request */
  readonly service_tier?: string | null
  /** This fingerprint represents the backend configuration that the model runs with */
  readonly system_fingerprint: string
  /** The object type, which is always chat.completion */
  readonly object: string
  /** Usage statistics for the completion request */
  readonly usage: {
    /** Number of tokens in the generated completion */
    readonly completion_tokens: number
    /** Number of tokens in the prompt */
    readonly prompt_tokens: number
    /** Total number of tokens used in the request (prompt + completion) */
    readonly total_tokens: number
  }
}

/**
 * Image schema
 */
export type Image = {
  /** The base64-encoded JSON of the generated image, if 'response_format' is 'b64_json' */
  readonly b64_json?: string | null
  /** The prompt that was used to generate the image, if there was any revision to the prompt */
  readonly revised_prompt: string
  /** The URL of the generated image, if 'response_format' is 'url' (default) */
  readonly url?: string | null
}

export type ImageRequest = {
  prompt: string,
  model: string,
  n: number,
  quality: string,
  response_format: ResponseFormat,
  size: string,
  style: string,
  user: string,
  sampler: SamplerType,
  seed: number,
  steps: number,
  cfg_scale: number,
  clip_guidance_preset: ClipGuidancePreset,
  style_preset: StylePreset
}

export enum ResponseFormat {
  Url = 'url',
  Base64 = 'base64',
}

export enum SamplerType {
  DDIM = 'DDIM',
  DDPM = 'DDPM',
  KDPMPP2M = 'K_DPMPP_2M',
  KDPMPP2SANCESTRAL = 'K_DPMPP_2S_ANCESTRAL',
  KDPM2 = 'K_DPM_2',
  KDPM2ANCESTRAL = 'K_DPM_2_ANCESTRAL',
  KEULER = 'K_EULER',
  KEULERANCESTRAL = 'K_EULER_ANCESTRAL',
  KHEUN = 'K_HEUN',
  KLMS = 'K_LMS',
}

export enum ClipGuidancePreset {
  None = 'NONE',
  FastBlue = 'FAST_BLUE',
  FastGreen = 'FAST_GREEN',
  SimpleSlow = 'SIMPLE SLOW',
  Slower = 'SLOWER',
  Slowest = 'SLOWEST',
}

export enum StylePreset {
  '3DModel' = '3DModel',
  AnalogFilm = 'analog-film',
  Anime = 'anime',
  Cinematic = 'cinematic',
  ComicBook = 'comic-book',
  DigitalArt = 'digital-art',
  Enhance = 'enhance',
  FantasyArt = 'fantasy-art',
  Isometric = 'isometric',
  LineArt = 'line-art',
  LowPoly = 'low-poly',
  ModelingCompound = 'modeling-compound',
  NeonPunk = 'neon-punk',
  Origami = 'origami',
  Photographic = 'photographic',
  PixelArt = 'pixel-art',
  TileTexture = 'tile-texture',
}

/**
 * Image response schema.
 */
export type ImageResponse = {
  /** The Unix timestamp (in seconds) of when the image was generated */
  readonly created: number
  /** A list of images */
  readonly data: Array<Image>
}

/**
 * Embedding schema
 */
export type Embedding = {
  /** The index of the embedding in the list of embeddings */
  readonly index: number
  /** The embedding vector, which is a list of floats */
  readonly embeddings: Array<number>
  /** The object type, which is always "embeddings" */
  readonly object: 'embeddings'
}

export interface CreateEmbeddingRequest {
  model: string;
  input: string | string[] | number[];
  user?: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
}

/**
 * Embedding response schema.
 */
export type EmbeddingResponse = {
  /** The object type, which is always "list" */
  readonly object: 'list'
  /** The list of Embedding objects */
  readonly data: Array<Embedding>
  /** The model used to generate the embeddings */
  readonly model: ModelName
  /** Usage statistics for embeddings generation */
  readonly usage: {
    /** Number of tokens in the generated embeddings */
    readonly completion_tokens: number
    /** Number of tokens in the prompt */
    readonly prompt_tokens: number
    /** Total number of tokens used in the request (prompt + completion) */
    readonly total_tokens: number
  }
}

// MCP Server API response types

export type MCPServerTool = {
  name: string;
  namespaced_name: string;
  description: string;
  input_schema: Record<string, unknown>;
  annotations: Record<string, unknown>;
};

export type MCPServer = {
  id: string;
  app_id: string;
  process_type: string;
  process_command: string;
  created_at: string;
  updated_at: string;
  tools: MCPServerTool[];
  server_status: 'registered' | 'disconnected';
  primitives_status: 'syncing' | 'synced' | 'error';
  namespace: string;
};

export type MCPServerList = MCPServer[];

export type CLIParseError<T extends Command> = CLIParseErrorOptions & {
  parse: {
    input: string,
    output: ParserOutput<T>
  }
}

export interface AgentMessage {
  role: string;
  content: string;
}

export interface AgentToolParameters {
  type: string;
  properties: Record<string, unknown>;
  required: string[];
}

export interface AgentToolParams {
  cmd?: string;
  description?: string;
  parameters?: AgentToolParameters;
}

export interface AgentRuntimeParams {
  target_app_name?: string;
  tool_params?: AgentToolParams;
}

export interface AgentTool {
  type: string;
  name: string;
  description?: string;
  runtime_params?: AgentRuntimeParams;
}

export type AgentRequest = {
  model: string;
  messages: Array<AgentMessage>;
  max_tokens_per_inference_request?: number;
  stop?: string[];
  temperature?: number;
  tools?: Array<AgentTool>;
  top_p?: number;
}
