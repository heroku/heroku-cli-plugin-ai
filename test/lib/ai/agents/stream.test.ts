import {expect} from 'chai'
import {ReadableStream} from 'node:stream/web'
import {formatCompletionMessage, handleAgentStream} from '../../../../src/lib/ai/agents/stream'
import type {ChatCompletionResponse} from '@heroku/ai'

describe('ai/agents/stream', function () {
  describe('handleAgentStream', function () {
    it('processes SSE data and returns completions', async function () {
      const messages: ChatCompletionResponse[] = []
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"Hello"}}]}\n'))
          controller.enqueue(new TextEncoder().encode('data: {"object":"chat.completion","choices":[{"message":{"content":"World"}}]}\n'))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
          controller.close()
        },
      })

      await handleAgentStream(stream, {
        onMessage: msg => messages.push(msg),
      })

      expect(messages).to.have.length(2)
      expect(messages[0].choices[0].message.content).to.equal('Hello')
      expect(messages[1].choices[0].message.content).to.equal('World')
    })

    it('handles tool completion with content array', async function () {
      const messages: ChatCompletionResponse[] = []
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"object":"tool.completion","choices":[{"message":{"content":"Tool \'html_to_markdown\' returned result: {\\"content\\":[{\\"type\\":\\"text\\",\\"text\\":\\"Hello\\"}]}"}}]}\n'))
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n'))
          controller.close()
        },
      })

      await handleAgentStream(stream, {
        onMessage: msg => messages.push(msg),
      })

      expect(messages).to.have.length(1)
      expect(messages[0].object).to.equal('tool.completion')
    })

    it('handles stream errors', async function () {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: invalid json\n'))
          controller.close()
        },
      })

      try {
        await handleAgentStream(stream)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).to.be.instanceOf(Error)
        expect((error as Error).message).to.include('Failed to parse SSE data')
      }
    })
  })

  describe('formatCompletionMessage', function () {
    it('formats chat completion message', function () {
      const completion: ChatCompletionResponse = {
        object: 'chat.completion',
        choices: [{
          message: {
            role: 'assistant',
            refusal: null,
            content: 'Hello, world!',
          },
          finish_reason: 'stop',
          index: 0,
        }],
        id: '123',
        created: 1715769600,
        model: 'claude-3-5-sonnet-latest',
        system_fingerprint: '123',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }

      const result = formatCompletionMessage(completion)
      expect(result).to.equal('Hello, world!')
    })

    it('formats tool completion with content array', function () {
      const completion: ChatCompletionResponse = {
        object: 'tool.completion',
        choices: [{
          message: {
            role: 'assistant',
            refusal: null,
            content: 'Tool \'html_to_markdown\' returned result: {"content":[{"type":"text","text":"Hello"}]}',
          },
          finish_reason: 'stop',
          index: 0,
        }],
        id: '123',
        created: 1715769600,
        model: 'claude-3-5-sonnet-latest',
        system_fingerprint: '123',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }

      const result = formatCompletionMessage(completion)
      expect(result).to.equal('Hello')
    })

    it('returns null for empty content', function () {
      const completion: ChatCompletionResponse = {
        object: 'chat.completion',
        choices: [{
          message: {
            role: 'assistant',
            refusal: null,
            content: '',
          },
          finish_reason: 'stop',
          index: 0,
        }],
        id: '123',
        created: 1715769600,
        model: 'claude-3-5-sonnet-latest',
        system_fingerprint: '123',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }

      const result = formatCompletionMessage(completion)
      expect(result).to.be.null
    })

    it('returns null for unknown object type', function () {
      const completion = {
        object: 'unknown',
        choices: [{
          message: {
            content: 'test',
          },
        }],
      } as ChatCompletionResponse

      const result = formatCompletionMessage(completion)
      expect(result).to.be.null
    })
  })
})
