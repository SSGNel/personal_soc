import { useState, useRef, useEffect } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { askAi } from "@/lib/invoke";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED: string[] = [
  "Is my PC safe right now?",
  "Why might my CPU be running high?",
  "Are my startup applications safe?",
  "What suspicious activity has been detected?",
  "Explain the recent alerts",
  "What processes should I be concerned about?",
  "Summarize today's security events",
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const answer = await askAi(question);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${String(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <Bot size={18} color="var(--color-blue)" />
        </div>
        <div>
          <h1 style={styles.pageTitle}>AI Assistant</h1>
          <p style={styles.subtitle}>
            Ask anything about your PC — security, performance, processes, startup, events
          </p>
        </div>
      </div>

      {/* Chat area */}
      <div style={styles.chatArea} className="card">
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <Sparkles size={28} color="var(--color-blue)" />
            <p style={styles.emptyTitle}>Ask me about your system</p>
            <p style={styles.emptyHint}>
              I have access to your live process data, alerts, startup entries, and event history.
            </p>
            <div style={styles.suggestions}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.messageList}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.messageRow,
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <div style={styles.avatarDot}>
                    <Bot size={12} color="var(--color-blue)" />
                  </div>
                )}
                <div
                  style={{
                    ...styles.bubble,
                    background:
                      msg.role === "user" ? "var(--color-blue)" : "var(--bg-hover)",
                    color: msg.role === "user" ? "white" : "var(--text-primary)",
                    borderRadius:
                      msg.role === "user"
                        ? "16px 16px 4px 16px"
                        : "4px 16px 16px 16px",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.messageRow, justifyContent: "flex-start" }}>
                <div style={styles.avatarDot}>
                  <Bot size={12} color="var(--color-blue)" />
                </div>
                <div
                  style={{
                    ...styles.bubble,
                    background: "var(--bg-hover)",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Analyzing your system…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <textarea
          className="input"
          style={{ resize: "none", height: 48, lineHeight: "1.4", paddingTop: 12 }}
          placeholder="Ask about CPU usage, processes, alerts, startup apps, recent events…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="btn btn-primary"
          style={{ height: 48, padding: "0 18px", flexShrink: 0 }}
          disabled={!input.trim() || loading}
          onClick={() => sendMessage(input)}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", flexDirection: "column", height: "100%", gap: 12 },
  header: { display: "flex", alignItems: "flex-start", gap: 12 },
  headerIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  pageTitle: { fontSize: 20, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 12, color: "var(--text-muted)" },
  chatArea: { flex: 1, overflow: "auto", minHeight: 220, padding: 16 },
  emptyState: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", height: "100%", gap: 10, padding: 24,
  },
  emptyTitle: { fontSize: 15, fontWeight: 600, color: "var(--text-primary)" },
  emptyHint: { fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 360 },
  suggestions: { display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 },
  messageList: { display: "flex", flexDirection: "column", gap: 12 },
  messageRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  avatarDot: {
    width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginBottom: 2,
    background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%", padding: "10px 14px", fontSize: 13,
    lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
  inputRow: { display: "flex", gap: 10, alignItems: "flex-end" },
};
