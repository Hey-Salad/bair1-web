import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer Platform | Bair1",
  description:
    "Build with air quality data. REST API, GraphQL, MCP Server, CLI, and SDKs for integrating Bair1 air quality readings into your applications.",
  openGraph: {
    title: "Bair1 Developer Platform",
    description: "Build with air quality data",
  },
};

function CodeBlock({ children, label }: { children: string; label?: string }) {
  return (
    <div className="relative rounded-lg overflow-hidden">
      {label && (
        <div className="bg-[#0d1405] px-4 py-2 text-xs font-mono text-[#8DC44A] border-b border-[#2a3a1a]">
          {label}
        </div>
      )}
      <pre className="bg-[#111a08] p-4 overflow-x-auto text-sm leading-relaxed">
        <code className="text-[#c8d8b8] font-mono whitespace-pre">
          {children}
        </code>
      </pre>
    </div>
  );
}

function SectionCard({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="bg-white rounded-2xl border border-[#e2e6de] p-8 md:p-10 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1A2410] mb-6">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function EndpointRow({
  method,
  path,
  description,
  params,
}: {
  method: string;
  path: string;
  description: string;
  params?: string;
}) {
  const methodColor =
    method === "GET"
      ? "bg-[#4A8A1A]/10 text-[#4A8A1A]"
      : "bg-[#8C6234]/10 text-[#8C6234]";

  return (
    <div className="border border-[#e2e6de] rounded-lg p-4 hover:border-[#4A8A1A]/40 transition-colors">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold font-mono ${methodColor}`}
        >
          {method}
        </span>
        <code className="text-sm font-mono text-[#1A2410] font-semibold break-all">
          {path}
        </code>
      </div>
      <p className="mt-2 text-sm text-[#1A2410]/70">{description}</p>
      {params && (
        <p className="mt-1 text-xs text-[#1A2410]/50 font-mono">
          Params: {params}
        </p>
      )}
    </div>
  );
}

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-[#F2F4F0]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Hero */}
      <section className="bg-[#1A2410] text-white">
        <div className="max-w-5xl mx-auto px-6 py-24 md:py-32">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-2 w-2 rounded-full bg-[#8DC44A] animate-pulse" />
            <span className="text-sm font-mono text-[#8DC44A] tracking-wide uppercase">
              Developer Platform
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
            Bair1 Developer
            <br />
            Platform
          </h1>
          <p className="mt-6 text-lg md:text-xl text-[#c8d8b8] max-w-2xl">
            Build with air quality data. Access real-time sensor readings,
            historical analytics, and export tools through our REST API,
            GraphQL, CLI, and MCP integrations.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="#quickstart"
              className="inline-flex items-center gap-2 bg-[#4A8A1A] hover:bg-[#3d7215] text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Quick Start
            </a>
            <a
              href="#rest-api"
              className="inline-flex items-center gap-2 border border-[#4A8A1A]/50 hover:border-[#4A8A1A] text-[#8DC44A] px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              API Reference
            </a>
          </div>
        </div>
      </section>

      {/* Navigation Pills */}
      <div className="sticky top-0 z-20 bg-[#F2F4F0]/90 backdrop-blur-md border-b border-[#e2e6de]">
        <div className="max-w-5xl mx-auto px-6">
          <nav className="flex gap-1 overflow-x-auto py-3 text-sm font-medium no-scrollbar">
            {[
              ["Quick Start", "#quickstart"],
              ["REST API", "#rest-api"],
              ["GraphQL", "#graphql"],
              ["MCP Server", "#mcp"],
              ["CLI", "#cli"],
              ["SDKs", "#sdks"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="px-4 py-2 rounded-full text-[#1A2410]/70 hover:text-[#1A2410] hover:bg-[#1A2410]/5 whitespace-nowrap transition-colors"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-10">
        {/* Quick Start */}
        <SectionCard title="Quick Start" id="quickstart">
          <p className="text-[#1A2410]/70 mb-6">
            Get up and running in seconds. No API key required for read
            endpoints.
          </p>
          <div className="space-y-4">
            <CodeBlock label="List all devices">
              {`curl https://bair1.live/api/v1/devices`}
            </CodeBlock>
            <CodeBlock label="Get the latest reading">
              {`curl https://bair1.live/api/readings/latest`}
            </CodeBlock>
          </div>
        </SectionCard>

        {/* REST API */}
        <SectionCard title="REST API" id="rest-api">
          <p className="text-[#1A2410]/70 mb-6">
            All endpoints return JSON. Read endpoints are public. Write
            endpoints require an API key passed via the{" "}
            <code className="bg-[#1A2410]/5 px-1.5 py-0.5 rounded text-sm font-mono">
              Authorization
            </code>{" "}
            header.
          </p>
          <div className="space-y-3">
            <EndpointRow
              method="GET"
              path="/api/v1/devices"
              description="List all registered sensors with their metadata and status."
            />
            <EndpointRow
              method="GET"
              path="/api/v1/devices/:id/readings"
              description="Retrieve historical readings for a specific device."
              params="?limit, ?from, ?to"
            />
            <EndpointRow
              method="GET"
              path="/api/v1/devices/:id/analytics"
              description="Get aggregated statistics and analytics for a device."
            />
            <EndpointRow
              method="GET"
              path="/api/v1/export"
              description="Export readings in CSV or JSON format."
              params="?format, ?device, ?from, ?to"
            />
            <EndpointRow
              method="GET"
              path="/api/readings/latest"
              description="Get the most recent reading across all devices."
            />
            <EndpointRow
              method="POST"
              path="/api/readings"
              description="Submit a new sensor reading. Requires API key authentication."
            />
          </div>

          <div className="mt-6">
            <CodeBlock label="Example: Get readings with filters">
              {`curl "https://bair1.live/api/v1/devices/XIAO-SPS30-5EAA7A/readings?limit=10&from=2026-01-01"`}
            </CodeBlock>
          </div>
        </SectionCard>

        {/* GraphQL */}
        <SectionCard title="GraphQL" id="graphql">
          <p className="text-[#1A2410]/70 mb-6">
            For more flexible queries, use the GraphQL endpoint at{" "}
            <code className="bg-[#1A2410]/5 px-1.5 py-0.5 rounded text-sm font-mono">
              /api/graphql
            </code>
            . Supports introspection.
          </p>
          <CodeBlock label="Example query">
            {`curl -X POST https://bair1.live/api/graphql \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "{
      devices {
        id
        name
        lastReading {
          pm25
          pm10
          temperature
          humidity
          timestamp
        }
      }
    }"
  }'`}
          </CodeBlock>
        </SectionCard>

        {/* MCP Server */}
        <SectionCard title="MCP Server" id="mcp">
          <p className="text-[#1A2410]/70 mb-6">
            Connect Bair1 to AI agents like Claude Desktop or Claude Code using
            the Model Context Protocol. Add the following to your MCP
            configuration:
          </p>
          <CodeBlock label="Claude Desktop / Claude Code — MCP config">
            {`{
  "mcpServers": {
    "bair1": {
      "command": "npx",
      "args": ["@heysalad/bair1-mcp"]
    }
  }
}`}
          </CodeBlock>
          <p className="mt-4 text-sm text-[#1A2410]/50">
            Once connected, your AI agent can query air quality data, list
            devices, and analyze trends through natural language.
          </p>
        </SectionCard>

        {/* CLI */}
        <SectionCard title="CLI" id="cli">
          <p className="text-[#1A2410]/70 mb-6">
            A command-line interface for quick access to Bair1 data from your
            terminal.
          </p>
          <div className="space-y-4">
            <CodeBlock label="Install">
              {`npm install -g @heysalad/bair1-cli`}
            </CodeBlock>
            <CodeBlock label="Usage">
              {`# Get the latest reading
bair1 latest

# List all devices
bair1 devices

# Export data as CSV
bair1 export --device XIAO-SPS30-5EAA7A --format csv`}
            </CodeBlock>
          </div>
        </SectionCard>

        {/* SDKs */}
        <SectionCard title="SDKs" id="sdks">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[#e2e6de] rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">
                <span className="text-[#4A8A1A] font-mono font-bold text-2xl">
                  Py
                </span>
              </div>
              <h3 className="font-semibold text-[#1A2410] mb-1">Python SDK</h3>
              <p className="text-sm text-[#1A2410]/50 mb-3">
                pip install bair1
              </p>
              <span className="inline-block px-3 py-1 rounded-full bg-[#8C6234]/10 text-[#8C6234] text-xs font-semibold">
                Coming Soon
              </span>
            </div>
            <div className="border border-[#e2e6de] rounded-lg p-6 text-center">
              <div className="text-3xl mb-3">
                <span className="text-[#4A8A1A] font-mono font-bold text-2xl">
                  JS
                </span>
              </div>
              <h3 className="font-semibold text-[#1A2410] mb-1">
                JavaScript SDK
              </h3>
              <p className="text-sm text-[#1A2410]/50 mb-3">
                npm install @heysalad/bair1
              </p>
              <span className="inline-block px-3 py-1 rounded-full bg-[#8C6234]/10 text-[#8C6234] text-xs font-semibold">
                Coming Soon
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <div className="text-center py-8 text-sm text-[#1A2410]/40">
          <p>
            Questions? Reach out at{" "}
            <a
              href="mailto:developers@bair1.live"
              className="text-[#4A8A1A] hover:underline"
            >
              developers@bair1.live
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
