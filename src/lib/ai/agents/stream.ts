import {ReadableStream} from 'node:stream/web'
import type {ChatCompletionResponse} from '@heroku/ai'

export interface StreamOptions {
  onMessage?: (completion: ChatCompletionResponse) => void
  onError?: (error: Error) => void
  onDone?: () => void
}

function parseSSEData(data: string, options: StreamOptions): ChatCompletionResponse | null {
  if (!data) {
    return null
  }

  if (data === '[DONE]') {
    options.onDone?.()
    return null
  }

  try {
    return JSON.parse(data) as ChatCompletionResponse
  } catch (error_) {
    const error = error_ as Error
    const streamError = new Error(`Failed to parse SSE data: ${error.message}`)
    options.onError?.(streamError)
    throw streamError
  }
}

function processLines(lines: string[], options: StreamOptions): ChatCompletionResponse[] {
  const completions: ChatCompletionResponse[] = []
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim()
      const completion = parseSSEData(data, options)
      if (completion) {
        completions.push(completion)
        options.onMessage?.(completion)
      }
    }
  }

  return completions
}

/**
 * Handles streaming Server-Sent Events (SSE) from the Heroku Inference Agents API.
 * @param stream The incoming message stream from the API response
 * @param options Optional callbacks for handling different stream events
 * @returns Promise that resolves with an array of all completions
 */
export async function handleAgentStream(stream: ReadableStream<Uint8Array>, options: StreamOptions = {}): Promise<ChatCompletionResponse[]> {
  const completions: ChatCompletionResponse[] = []
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      processLines(lines, options)
    }

    if (buffer) {
      processLines([buffer], options)
    }

    return completions
  } catch (error) {
    const streamError = error instanceof Error ? error : new Error('Stream error')
    options.onError?.(streamError)
    throw streamError
  } finally {
    reader.releaseLock()
  }
}

/**
 * Formats a completion message for display.
 * @param completion The completion response to format
 * @returns Formatted message string or null if no content
 */
export function formatCompletionMessage(completion: ChatCompletionResponse): string | null {
  if (completion.object === 'chat.completion') {
    const content = completion.choices[0].message.content
    return content || null
  }

  if (completion.object === 'tool.completion') {
    const content = completion.choices[0].message.content
    if (!content) return null

    // Check if content contains a tool result
    const toolResultMatch = content.match(/Tool '.*?' returned result: ({.*})/s)
    if (toolResultMatch) {
      try {
        const parsed = JSON.parse(toolResultMatch[1])
        if (Array.isArray(parsed.content)) {
          return parsed.content
            .map((item: {type: string; text: string}) => item.type === 'text' ? item.text : '')
            .filter(Boolean)
            .join('\n')
        }
      } catch {
        // If JSON parsing fails, return the original content
      }
    }

    return content
  }

  return null
}
