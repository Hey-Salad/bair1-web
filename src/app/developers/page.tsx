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

function ToolCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#e2e6de] rounded-lg p-5 bg-[#FAFBF8]">
      <h3 className="font-semibold text-[#1A2410]">{title}</h3>
      <p className="mt-1 mb-4 text-sm text-[#1A2410]/60">{description}</p>
      {children}
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
              ["Agents", "#agents"],
              ["Firmware", "#firmware"],
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
            Get up and running in seconds. The latest reading endpoint is
            public. Device registry, export, and write endpoints require a
            Bair1 API key.
          </p>
          <div className="space-y-4">
            <CodeBlock label="Get the latest reading">
              {`curl https://www.bair1.live/api/readings/latest`}
            </CodeBlock>
            <CodeBlock label="List registered devices">
              {`curl https://www.bair1.live/api/v1/devices \\
  -H "Authorization: Bearer $BAIR1_API_KEY"`}
            </CodeBlock>
            <CodeBlock label="Use the JavaScript SDK">
              {`npm install @heysalad/bair1

import { Bair1Client } from "@heysalad/bair1";

const bair1 = new Bair1Client({ apiKey: process.env.BAIR1_API_KEY });
const latest = await bair1.latest();`}
            </CodeBlock>
          </div>
        </SectionCard>

        {/* REST API */}
        <SectionCard title="REST API" id="rest-api">
          <p className="text-[#1A2410]/70 mb-6">
            All endpoints return JSON. Use an API key for device registry,
            exports, and writes. Pass it via the{" "}
            <code className="bg-[#1A2410]/5 px-1.5 py-0.5 rounded text-sm font-mono">
              Authorization
            </code>{" "}
            header or the{" "}
            <code className="bg-[#1A2410]/5 px-1.5 py-0.5 rounded text-sm font-mono">
              x-api-key
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
              {`curl "https://www.bair1.live/api/v1/devices/XIAO-SPS30-5EAA7A/readings?limit=10&from=2026-01-01" \\
  -H "Authorization: Bearer $BAIR1_API_KEY"`}
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
            {`curl -X POST https://www.bair1.live/api/graphql \\
  -H "Content-Type: application/json" \\
  -d '{
    "query": "{
      registeredDevices {
        deviceId
        name
        latestReading {
          pm25
          pm10
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
      "args": ["-y", "@heysalad/bair1-mcp"],
      "env": {
        "BAIR1_API_KEY": "your-api-key"
      }
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
              {`npm install -g @heysalad/bair1`}
            </CodeBlock>
            <CodeBlock label="Usage">
              {`# Save your API key for authenticated endpoints
bair1 config set-key "$BAIR1_API_KEY"

# Get the latest reading
bair1 latest

# List all devices
bair1 devices

# Export data as CSV
bair1 export --device XIAO-SPS30-5EAA7A --format csv`}
            </CodeBlock>
          </div>
        </SectionCard>

        {/* Agent Guides */}
        <SectionCard title="Agent Guides" id="agents">
          <p className="text-[#1A2410]/70 mb-6">
            Agent tools can query Bair1 through MCP, the JavaScript SDK, or the
            REST API. MCP is the best default for coding agents because it
            exposes Bair1 as named tools instead of requiring custom glue code.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ToolCard
              title="Codex"
              description="Use the MCP server when the environment supports MCP tools, or import the SDK in local scripts."
            >
              <CodeBlock>
                {`# MCP command
npx -y @heysalad/bair1-mcp

# SDK command
npm install @heysalad/bair1`}
              </CodeBlock>
            </ToolCard>
            <ToolCard
              title="Claude Code"
              description="Register the MCP server once, then ask Claude to inspect readings, devices, and exports."
            >
              <CodeBlock>
                {`claude mcp add bair1 \\
  -e BAIR1_API_KEY=$BAIR1_API_KEY \\
  npx -y @heysalad/bair1-mcp`}
              </CodeBlock>
            </ToolCard>
            <ToolCard
              title="Cursor"
              description="Add the Bair1 MCP server to your MCP configuration and keep the API key in the environment."
            >
              <CodeBlock>
                {`{
  "mcpServers": {
    "bair1": {
      "command": "npx",
      "args": ["-y", "@heysalad/bair1-mcp"]
    }
  }
}`}
              </CodeBlock>
            </ToolCard>
            <ToolCard
              title="Antigravity"
              description="Use the same stdio MCP command if your workspace supports custom MCP servers."
            >
              <CodeBlock>
                {`BAIR1_API_KEY=your-api-key \\
  npx -y @heysalad/bair1-mcp`}
              </CodeBlock>
            </ToolCard>
          </div>
        </SectionCard>

        {/* Firmware */}
        <SectionCard title="Firmware" id="firmware">
          <p className="text-[#1A2410]/70 mb-6">
            Bair1 firmware can post sensor readings directly to the API or to a
            relay when the network path needs TLS or cellular handling.
          </p>
          <div className="space-y-4">
            <CodeBlock label="Reading upload">
              {`POST https://www.bair1.live/api/readings
Authorization: Bearer $BAIR1_API_KEY
Content-Type: application/json

{
  "deviceId": "YOUR_DEVICE_ID",
  "deviceName": "Bair1 Sensor",
  "family": "bair1",
  "pm25": 8.4,
  "pm10": 13.2,
  "aqi": 34,
  "transport": "wifi"
}`}
            </CodeBlock>
            <CodeBlock label="Cellular relay target">
              {`# For SIM800L or cellular paths, send to the relay
POST https://sensor.heysalad.app/api/readings

# The relay forwards to:
https://www.bair1.live/api/readings`}
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
              <span className="inline-block px-3 py-1 rounded-full bg-[#4A8A1A]/10 text-[#4A8A1A] text-xs font-semibold">
                Ready to publish
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
