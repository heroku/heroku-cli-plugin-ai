/// <reference types="node" />
// Model Context Protocol spec 2025-03-26: stdio <-> Streamable HTTP/SSE proxy
// Requires Node.js 20+ for native fetch and Headers
// If using TypeScript, run: npm install --save-dev @types/node
import {createInterface} from 'readline/promises'
import process from 'process'
// NOTE: If you see a rootDir error for the SDK import below, adjust your tsconfig.json rootDir or use the SDK as a package.
// import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'

export class MCPStdioToSSEProxy {
  private remoteUrl: URL | null = null;
  private token: string | null = null;
  private rl = createInterface({input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY});
  private transport: StreamableHTTPClientTransport | null = null;
  private readyToProcess = false;
  private messageQueue: string[] = [];

  /**
   * Set the remote URL at runtime.
   * @param url - The remote URL to set.
   * @example
   * ```ts
   * const proxy = new MCPStdioToSSEProxy()
   * proxy.setRemoteUrl(new URL('https://your-mcp-server/mcp'))
   * ```
   * @returns void
   */
  public setRemoteUrl(url: URL) {
    this.remoteUrl = url
    this.checkReady()
  }

  /**
   * Set the token at runtime.
   * @param token - The token to set.
   * @example
   * ```ts
   * const proxy = new MCPStdioToSSEProxy()
   * proxy.setToken('YOUR_TOKEN')
   * ```
   * @returns void
   */
  public setToken(token: string) {
    this.token = token
    this.checkReady()
  }

  /**
   * Check if both remoteUrl and token are set, and if so, start processing queued messages.
   * @returns void
   */
  private async checkReady() {
    if (this.remoteUrl && this.token && !this.readyToProcess) {
      this.readyToProcess = true
      this.transport = new StreamableHTTPClientTransport(this.remoteUrl, {
        requestInit: {
          headers: {Authorization: `Bearer ${this.token}`},
        },
      })

      // eslint-disable-next-line unicorn/prefer-add-event-listener
      this.transport.onmessage = msg => {
        process.stdout.write(JSON.stringify(msg) + '\n')
      }

      // eslint-disable-next-line unicorn/prefer-add-event-listener
      this.transport.onerror = (err: Error) => {
        process.stderr.write('Transport error: ' + err.message + '\n')
      }

      await this.transport.start()
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()
        if (msg) {
          await this.handleLine(msg)
        }
      }
    }
  }

  private async handleLine(line: string) {
    const trimmed = line.trim()
    if (!trimmed) return
    if (!this.readyToProcess || !this.transport) {
      this.messageQueue.push(trimmed)
      return
    }

    let parsed
    try {
      parsed = JSON.parse(trimmed)
    } catch (error: any) {
      process.stderr.write('Invalid JSON: ' + error.message + '\n')
      return
    }

    try {
      await this.transport.send(parsed)
    } catch (error: any) {
      process.stderr.write('Send error: ' + (error && error.message ? error.message : error) + '\n')
    }
  }

  public async run(): Promise<void> {
    for await (const line of this.rl) {
      await this.handleLine(line)
    }
  }
}

// Example usage (not CLI):
// const proxy = new MCPStdioToSSEProxy();
// proxy.setRemoteUrl(new URL('https://your-mcp-server/mcp'));
// proxy.setToken('YOUR_TOKEN');
// proxy.run();
