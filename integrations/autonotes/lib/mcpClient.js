// Minimal MCP HTTP client for Lurker's /mcp endpoint.
//
// Lurker's MCP surface is JSON-RPC 2.0 over a single POST per request — no
// session state on the server. We hand-roll the wire format here (rather than
// pulling in @modelcontextprotocol/sdk) so the sample stays readable and the
// transport doesn't drift if the upstream SDK rev-locks.

export class McpError extends Error {
  constructor(message, { code, data } = {}) {
    super(message);
    this.name = "McpError";
    this.code = code;
    this.data = data;
  }
}

export class McpToolError extends Error {
  constructor(message, { payload } = {}) {
    super(message);
    this.name = "McpToolError";
    this.payload = payload;
  }
}

export class McpClient {
  constructor({ url, token }) {
    if (!url) throw new Error("McpClient: url is required");
    if (!token) throw new Error("McpClient: token is required");
    this.url = url.replace(/\/$/, "");
    this.token = token;
    this.rpcId = 0;
  }

  async call(method, params = {}) {
    const id = ++this.rpcId;
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new McpError(`HTTP ${res.status} from ${this.url}: ${body.slice(0, 400)}`, {
        code: res.status,
      });
    }

    const envelope = await res.json();
    if (envelope.error) {
      throw new McpError(envelope.error.message ?? "MCP error", {
        code: envelope.error.code,
        data: envelope.error.data,
      });
    }
    return envelope.result;
  }

  async toolsList() {
    return this.call("tools/list", {});
  }

  // Returns the unwrapped tool payload (parsed JSON from the first text block).
  // Throws McpToolError when the tool replied with isError: true.
  async toolCall(name, args = {}) {
    const result = await this.call("tools/call", { name, arguments: args });
    const payload = extractToolPayload(result);
    if (result?.isError) {
      throw new McpToolError(`MCP tool ${name} returned error`, { payload });
    }
    return payload;
  }
}

function extractToolPayload(result) {
  const block = Array.isArray(result?.content) ? result.content[0] : null;
  if (!block || block.type !== "text" || typeof block.text !== "string") {
    return result;
  }
  try {
    return JSON.parse(block.text);
  } catch {
    return { text: block.text };
  }
}
