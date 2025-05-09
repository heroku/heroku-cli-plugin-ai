// Model Context Protocol spec 2025-03-26: stdio <-> Streamable HTTP/SSE proxy
// Requires Node.js 20+ for native fetch and Headers
import {createInterface} from 'readline/promises'

class MCPStdioToSSEProxy {
  private remoteUrl: URL;
  private sessionId: string | null = null;
  private handshakeState: 'awaiting-initialize' | 'awaiting-initialize-response' | 'awaiting-initialized' | 'ready' = 'awaiting-initialize';
  private pendingQueue: string[] = [];
  private rl = createInterface({input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY});

  constructor(remoteUrl: URL) {
    this.remoteUrl = remoteUrl
  }

  private logError(msg: string) {
    process.stderr.write(msg + '\n')
  }

  private isValidJsonRpc(msg: any): boolean {
    if (Array.isArray(msg)) {
      return msg.every(this.isValidJsonRpc.bind(this))
    }

    return typeof msg === 'object' && msg !== null && msg.jsonrpc === '2.0'
  }

  private async postToRemote(message: string, timeoutMs = 60000): Promise<Response> {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    })
    if (this.sessionId) headers.set('Mcp-Session-Id', this.sessionId)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(this.remoteUrl, {
        method: 'POST',
        headers,
        body: message,
        signal: controller.signal,
      })
      clearTimeout(timeout)
      return res
    } catch (error: any) {
      clearTimeout(timeout)
      throw error
    }
  }

  private async streamSSE(body: any): Promise<void> {
    let buffer = ''
    for await (const chunk of body) {
      buffer += chunk.toString('utf8')
      let idx: number
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        const lines = eventBlock.split('\n')
        let data = ''
        for (const line of lines) {
          if (line.startsWith('data:')) {
            data += line.slice(5).trim()
          }
        }

        if (data) {
          process.stdout.write(data + '\n')
        }
      }
    }
  }

  private async handleInitializeRequest(message: string, parsed: any): Promise<void> {
    if (!parsed || parsed.method !== 'initialize') {
      this.logError('First message must be an initialize request.')
      throw new Error('Invalid initialize request')
    }

    this.handshakeState = 'awaiting-initialize-response'
    const res = await this.postToRemote(message)
    if (!this.sessionId && res.headers.has('mcp-session-id')) {
      this.sessionId = res.headers.get('mcp-session-id')
    }

    const contentType = res.headers.get('content-type') || ''
    if (contentType.startsWith('text/event-stream')) {
      await this.streamSSE(res.body)
    } else if (res.body) {
      const text = await res.text()
      if (text.trim()) process.stdout.write(text.trim() + '\n')
    }

    this.handshakeState = 'awaiting-initialized'
  }

  private async handleInitializedNotification(message: string, parsed: any): Promise<void> {
    if (!parsed || parsed.method !== 'notifications/initialized') {
      this.logError('Second message must be notifications/initialized.')
      throw new Error('Invalid initialized notification')
    }

    const res = await this.postToRemote(message)
    if (res.status === 404) {
      this.sessionId = null
      this.handshakeState = 'awaiting-initialize'
      this.logError('Session lost after initialized. Restarting handshake.')
      return
    }

    this.handshakeState = 'ready'
    // Flush any queued messages
    for (const queued of this.pendingQueue) {
      await this.forwardMessage(queued)
    }

    this.pendingQueue = []
  }

  private async handleHandshake(message: string, parsed: any): Promise<void> {
    try {
      if (this.handshakeState === 'awaiting-initialize') {
        await this.handleInitializeRequest(message, parsed)
      } else if (this.handshakeState === 'awaiting-initialized') {
        await this.handleInitializedNotification(message, parsed)
      }
    } catch (error: any) {
      this.logError('Handshake error: ' + (error && error.message ? error.message : error))
      throw error
    }
  }

  private async forwardMessage(message: string): Promise<void> {
    let parsed: unknown
    try {
      parsed = JSON.parse(message)
    } catch (error: any) {
      this.logError('Invalid JSON: ' + error.message)
      return
    }

    if (!this.isValidJsonRpc(parsed)) {
      this.logError('Not a valid JSON-RPC 2.0 message.')
      return
    }

    // Handshake enforcement
    if (this.handshakeState !== 'ready') {
      await this.handleHandshake(message, parsed)
      return
    }

    // Normal operation
    try {
      const res = await this.postToRemote(message)
      if (res.status === 404) {
        // Session lost, restart handshake
        this.sessionId = null
        this.handshakeState = 'awaiting-initialize'
        this.logError('Session lost (404). Restarting handshake.')
        this.pendingQueue = []
        return
      }

      const contentType = res.headers.get('content-type') || ''
      if (contentType.startsWith('text/event-stream')) {
        await this.streamSSE(res.body)
        return
      }

      if (res.body) {
        const text = await res.text()
        if (text.trim()) process.stdout.write(text.trim() + '\n')
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.logError('Request timed out.')
      } else {
        this.logError('Remote error: ' + (error && error.message ? error.message : error))
      }
    }
  }

  public async run(): Promise<void> {
    for await (const line of this.rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (this.handshakeState === 'ready') {
        await this.forwardMessage(trimmed)
      } else if (
        this.handshakeState === 'awaiting-initialize' ||
        this.handshakeState === 'awaiting-initialize-response' ||
        this.handshakeState === 'awaiting-initialized'
      ) {
        // During handshake, queue any extra messages
        if (this.handshakeState === 'awaiting-initialize') {
          await this.forwardMessage(trimmed)
        } else {
          this.pendingQueue.push(trimmed)
        }
      }
    }
  }

  static async main(remoteUrl: URL) {
    const proxy = new MCPStdioToSSEProxy(remoteUrl)
    try {
      await proxy.run()
    } catch (error: any) {
      proxy.logError('Fatal error: ' + (error && error.message ? error.message : error))
      throw error
    }
  }
}

export const main = MCPStdioToSSEProxy.main
