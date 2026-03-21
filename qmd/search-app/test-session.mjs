import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import crypto from 'crypto';

async function main() {
    const sessionId = crypto.randomUUID();
    const transport = new StreamableHTTPClientTransport(
        new URL("http://localhost:8181/mcp"),
        {
            headers: {
                'Mcp-Session-Id': sessionId
            }
        }
    );
    const client = new Client({ name: "qmd-search", version: "1" }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("Connected seamlessly!");
    } catch (e) {
        console.error("Connect error:", e?.message || e);
        process.exit(1);
    }

    try {
        console.log("Calling tool...");
        const result = await client.callTool({ name: "status" });
        console.log("CallTool SUCCESS:", JSON.stringify(result).substring(0, 100));
    } catch (e) {
        console.error("CallTool FAILED:", e?.message || e);
    }
}

main().catch(console.error);
