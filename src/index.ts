import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { services, ApiService, ApiEndpoint } from "./data/services.js";
import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

function createMcpServer() {
  const server = new McpServer({
    name: "api-docs-mcp",
    version: "1.0.0",
  });

  // === ИНСТРУМЕНТ 1: search_api ===
  server.tool(
    "search_api",
    "Search for API services by name, category, or keyword",
    { query: z.string().describe("Search query") },
    async ({ query }) => {
      const q = query.toLowerCase();
      const results = services.filter(
        (s: ApiService) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.category.some((c: string) => c.toLowerCase().includes(q))
      );

      if (results.length === 0) {
        return {
          content: [{ type: "text" as const, text: `No services found for "${query}"` }],
        };
      }

      const summary = results
        .slice(0, 20)
        .map(
          (s: ApiService) =>
            `**${s.name}** [${s.category.join(", ")}]\n${s.description}\nBase URL: ${s.baseUrl}`
        )
        .join("\n\n---\n\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `Found ${results.length} services:\n\n${summary}`,
          },
        ],
      };
    }
  );

  // === ИНСТРУМЕНТ 2: get_api_docs ===
  server.tool(
    "get_api_docs",
    "Get full API documentation for a specific service",
    { service_name: z.string().describe("Service name") },
    async ({ service_name }) => {
      const svc = findService(service_name);
      if (!svc) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Service "${service_name}" not found. Use search_api to find it.`,
            },
          ],
        };
      }
      return { content: [{ type: "text" as const, text: formatFullDocs(svc) }] };
    }
  );

  // === ИНСТРУМЕНТ 3: get_endpoint ===
  server.tool(
    "get_endpoint",
    "Get details of a specific API endpoint",
    {
      service_name: z.string().describe("Service name"),
      endpoint_name: z.string().describe("Endpoint name (e.g. send_message)"),
    },
    async ({ service_name, endpoint_name }) => {
      const svc = findService(service_name);
      if (!svc) {
        return {
          content: [{ type: "text" as const, text: `Service "${service_name}" not found.` }],
        };
      }

      const epName = endpoint_name.toLowerCase();
      const ep = Object.entries(svc.endpoints).find(([key]) =>
        key.toLowerCase().includes(epName)
      );

      if (!ep) {
        const available = Object.keys(svc.endpoints).join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Endpoint "${endpoint_name}" not found in ${svc.name}. Available: ${available}`,
            },
          ],
        };
      }

      const [name, endpoint] = ep as [string, ApiEndpoint];
      const lines = [
        `## ${svc.name} → ${name}`,
        `**${endpoint.method} ${svc.baseUrl}${endpoint.path}**`,
        endpoint.description,
        endpoint.contentType ? `Content-Type: ${endpoint.contentType}` : "",
        endpoint.bodyExample ? `\nBody:\n\`\`\`json\n${endpoint.bodyExample}\n\`\`\`` : "",
        endpoint.response ? `\nResponse: ${endpoint.response}` : "",
        endpoint.notes?.length
          ? `\nNotes:\n${endpoint.notes.map((n: string) => `- ${n}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      return { content: [{ type: "text" as const, text: lines }] };
    }
  );

  // === ИНСТРУМЕНТ 4: get_n8n_http_config ===
  server.tool(
    "get_n8n_http_config",
    "Get n8n HTTP Request node configuration for a service endpoint",
    {
      service_name: z.string().describe("Service name"),
      endpoint_name: z.string().describe("Endpoint name"),
    },
    async ({ service_name, endpoint_name }) => {
      const svc = findService(service_name);
      if (!svc) {
        return {
          content: [{ type: "text" as const, text: `Service "${service_name}" not found.` }],
        };
      }

      const epName = endpoint_name.toLowerCase();
      const ep = Object.entries(svc.endpoints).find(([key]) =>
        key.toLowerCase().includes(epName)
      );

      if (!ep) {
        return {
          content: [{ type: "text" as const, text: `Endpoint "${endpoint_name}" not found.` }],
        };
      }

      const [, endpoint] = ep as [string, ApiEndpoint];
      const config = {
        method: endpoint.method,
        url: `${svc.baseUrl}${endpoint.path}`,
        authentication: svc.auth.type,
        authSetup: svc.auth.setup,
        headers: {
          ...(svc.defaultHeaders || {}),
          ...(svc.auth.type === "header" && svc.auth.headerName
            ? { [svc.auth.headerName]: "YOUR_API_KEY" }
            : {}),
        },
        contentType: endpoint.contentType || "application/json",
        body: endpoint.bodyExample || "",
        n8nNotes: svc.n8nNotes,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(config, null, 2) }],
      };
    }
  );

  // === ИНСТРУМЕНТ 5: list_services ===
  server.tool(
    "list_services",
    "List all available services, optionally filtered by category",
    {
      category: z
        .string()
        .optional()
        .describe("Filter by category (optional). Examples: llm, email, crm, payments, messaging"),
    },
    async ({ category }) => {
      let filtered = services;
      if (category) {
        const cat = category.toLowerCase();
        filtered = services.filter((s: ApiService) =>
          s.category.some((c: string) => c.toLowerCase().includes(cat))
        );
      }

      const list = filtered
        .map((s: ApiService) => `- **${s.name}** [${s.category.join(", ")}]`)
        .join("\n");

      return {
        content: [
          {
            type: "text" as const,
            text: `## Services${category ? ` in "${category}"` : ""} (${filtered.length})\n\n${list}`,
          },
        ],
      };
    }
  );

  return server;
}

// === Вспомогательные функции ===
function findService(name: string): ApiService | undefined {
  const q = name.toLowerCase();
  return (
    services.find((s: ApiService) => s.name.toLowerCase() === q) ||
    services.find((s: ApiService) => s.name.toLowerCase().includes(q))
  );
}

function formatFullDocs(svc: ApiService): string {
  const parts: string[] = [
    `# ${svc.name}`,
    svc.description,
    `\n## Base URL\n${svc.baseUrl}`,
    `\n## Authentication\nType: ${svc.auth.type}\n${svc.auth.setup}`,
  ];

  if (svc.auth.headerName) parts.push(`Header: ${svc.auth.headerName}`);
  if (svc.defaultHeaders)
    parts.push(`\n## Required Headers\n${JSON.stringify(svc.defaultHeaders, null, 2)}`);

  parts.push("\n## Endpoints");
  for (const [name, ep] of Object.entries(svc.endpoints)) {
    const endpoint = ep as ApiEndpoint;
    parts.push(`\n### ${name}`);
    parts.push(`**${endpoint.method} ${endpoint.path}**`);
    parts.push(endpoint.description);
    if (endpoint.contentType) parts.push(`Content-Type: ${endpoint.contentType}`);
    if (endpoint.bodyExample) parts.push(`\`\`\`json\n${endpoint.bodyExample}\n\`\`\``);
    if (endpoint.response) parts.push(`Response: ${endpoint.response}`);
    if (endpoint.notes?.length)
      parts.push(endpoint.notes.map((n: string) => `- ${n}`).join("\n"));
  }

  parts.push(`\n## n8n Notes\n${svc.n8nNotes.map((n: string) => `- ${n}`).join("\n")}`);
  if (svc.rateLimits) parts.push(`\n## Rate Limits\n${svc.rateLimits}`);
  parts.push(`\n## Docs\n${svc.docsUrl}`);

  return parts.join("\n");
}

// === Хранилище транспортов для SSE ===
const sseTransports: Record<string, SSEServerTransport> = {};

// === Маршруты ===

app.get("/health", (_req, res) => {
  res.json({ status: "ok", services: services.length });
});

// Новый Streamable HTTP (основной)
app.all("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Старый SSE (для совместимости)
app.get("/sse", async (_req, res) => {
  const server = createMcpServer();
  const transport = new SSEServerTransport("/messages", res);
  sseTransports[transport.sessionId] = transport;
  res.on("close", () => {
    delete sseTransports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = sseTransports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).json({ error: "Session not found" });
  }
});

app.get("/", (_req, res) => {
  res.json({
    name: "api-docs-mcp-server",
    version: "1.0.0",
    services: services.length,
    endpoints: { mcp: "/mcp", sse: "/sse", health: "/health" },
  });
});

// === Запуск ===
const port = parseInt(process.env.PORT || "3001");
app.listen(port, () => {
  console.log(`MCP Server running on port ${port}`);
  console.log(`Services loaded: ${services.length}`);
  console.log(`Health: http://localhost:${port}/health`);
});