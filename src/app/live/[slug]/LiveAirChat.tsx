"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useState } from "react";

type Props = {
  feedName: string;
  location: string;
  deviceIds: string[];
};

function messageText(message: UIMessage) {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export default function LiveAirChat({ feedName, location, deviceIds }: Props) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        feedContext: `${feedName} at ${location}. Feed device IDs: ${deviceIds.join(", ")}.`,
      },
    }),
  });
  const isLoading = status === "streaming" || status === "submitted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  return (
    <section className="border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-semibold">Ask about this air</h2>
          <p className="mt-1 text-xs text-muted">Live Bair1 readings, LAQN, weather, and pollen.</p>
        </div>
        <span className="border border-primary/50 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">GPT-5.6</span>
      </div>

      <div className="max-h-72 min-h-28 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-sm text-muted">Try “How does the kitchen compare with LAQN right now?”</p>
        ) : (
          messages.map((message) => {
            const text = messageText(message);
            if (!text) return null;
            return (
              <div key={message.id} className={message.role === "user" ? "text-right" : "text-left"}>
                <p
                  className={`inline-block max-w-[90%] whitespace-pre-wrap px-3 py-2 text-sm leading-6 ${
                    message.role === "user" ? "bg-primary text-white" : "border border-border bg-bg text-ink"
                  }`}
                >
                  {text}
                </p>
              </div>
            );
          })
        )}
        {isLoading ? <p className="text-xs text-muted">Bair is checking the data…</p> : null}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the live air…"
          className="min-w-0 flex-1 border border-border bg-bg px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-primary"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
