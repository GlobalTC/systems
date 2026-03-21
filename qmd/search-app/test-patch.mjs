import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function main() {
    const transport = new StreamableHTTPClientTransport(new URL("http://localhost:8181/mcp"));
    const client = new Client({ name: "qmd-search", version: "1" }, { capabilities: {} });

    // Monkey patch request
    const originalRequest = client.request.bind(client);
    client.request = async (req, schema, options) => {
        if (req.method === 'initialize') {
            try {
                return await originalRequest(req, schema, options);
            } catch (e) {
                if (e.message?.includes('already initialized') || e.message?.includes('Server already initialized')) {
                    console.log("Intercepted initialize error! Returning mock init result.");
                    return {
                        protocolVersion: '2024-11-05',
                        capabilities: {},
                        serverInfo: { name: 'qmd', version: '1.0.0' }
                    };
                }
                throw e;
            }
        }
        return originalRequest(req, schema, options);
    };

    // Monkey patch notification
    const originalNotification = client.notification.bind(client);
    client.notification = async (req) => {
        if (req.method === 'notifications/initialized') {
            try {
                return await originalNotification(req);
            } catch (e) {
                if (e.message?.includes('already initialized') || e.message?.includes('Server already initialized')) {
                    console.log("Intercepted notification error! Ignoring.");
                    return;
                }
                // We might just swallow all notification errors anyway to be safe during init
                console.log("Swallowing notification/initialized error:", e.message);
                return;
            }
        }
        return originalNotification(req);
    };

    try {
        await client.connect(transport);
        console.log("Connected seamlessly!");
    } catch (e) {
        console.error("Connect error:", e);
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
