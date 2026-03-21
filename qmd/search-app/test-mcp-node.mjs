import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
    console.log("Starting test...");
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost:8181/mcp"));
    const client = new Client({ name: "qmd-search", version: "1" }, { capabilities: {} });

    try {
        await client.connect(transport);
        console.log("Connected seamlessly!");
    } catch (e) {
        console.error("Connect error:", e?.message);
        if (e.message && e.message.includes('already initialized')) {
            console.log("Caught already initialized error. Attempting to proceed...");
        } else {
            console.error("Connection failed with another error:", e);
            process.exit(1);
        }
    }

    try {
        console.log("Calling tool...");
        const result = await client.callTool({ name: "status" });
        console.log("CallTool SUCCESS:", JSON.stringify(result));
    } catch (e) {
        console.error("CallTool FAILED:", e?.message || e);
    }
}

main().catch(console.error);
