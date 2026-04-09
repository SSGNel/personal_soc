import { useState, useRef } from "react";
import { useAppStore } from "@/store";
import { removeStartupEntry, askAi } from "@/lib/invoke";
import type { StartupEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Rocket, AlertCircle, Trash2, Bot, Send, X } from "lucide-react";

interface AiMessage { role: "user" | "ai"; text: string; }

export default function StartupPage() {
  const { startupEntries, removeStartupEntry: removeFromStore } = useAppStore();
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // AI panel state
  const [aiEntry, setAiEntry] = useState<StartupEntry | null>(null);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiEndRef = useRef<HTMLDivElement>(null);

  const newEntries = startupEntries.filter((e) => e.is_new);
  const allEntries = [...startupEntries].sort((a, b) => {
    if (a.is_new !== b.is_new) return a.is_new ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleRemove = async (id: string, name: string, locationType: string) => {
    if (!confirm(`Remove "${name}" from startup? This will delete the registry entry.`)) return;
    setRemoving((s) => new Set(s).add(id));
    setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
    try {
      await removeStartupEntry(id, name, locationType);
      removeFromStore(id);
      if (aiEntry?.id === id) setAiEntry(null);
    } catch (err) {
      setErrors((e) => ({ ...e, [id]: String(err) }));
    } finally {
      setRemoving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  };

  const openAi = (entry: StartupEntry) => {
    if (aiEntry?.id === entry.id) { setAiEntry(null); return; }
    setAiEntry(entry);
    setAiMessages([]);
    setAiInput("");
  };

  const handleAskAi = async (question?: string) => {
    if (!aiEntry) return;
    const q = (question ?? aiInput).trim();
    if (!q || aiLoading) return;
    setAiInput("");
    setAiMessages((m) => [...m, { role: "user", text: q }]);
    setAiLoading(true);
    try {
      // Prepend entry context so the AI answers specifically about this entry
      const contextualQ = `Regarding the startup entry "${aiEntry.name}" (path: ${aiEntry.path}, location: ${aiEntry.location_type}, signer: ${aiEntry.signer_status}, enabled: ${aiEntry.enabled}${aiEntry.is_new ? ", NEWLY DETECTED" : ""}) — ${q}`;
      const answer = await askAi(contextualQ);
      setAiMessages((m) => [...m, { role: "ai", text: answer }]);
    } catch (err) {
      setAiMessages((m) => [...m, { role: "ai", text: `Error: ${err}` }]);
    } finally {
      setAiLoading(false);
      setTimeout(() => aiEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>Startup Entries</h1>

      {newEntries.length > 0 && (
        <div style={styles.newAlert}>
          <AlertCircle size={16} color="var(--color-orange)" />
          <span>
            {newEntries.length} new startup{" "}
            {newEntries.length === 1 ? "entry" : "entries"} detected
          </span>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Signer</th>
                <th>Enabled</th>
                <th>First Seen</th>
                <th>Path</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {allEntries.map((entry) => (
                <tr
                  key={entry.id}
                  style={aiEntry?.id === entry.id ? { background: "rgba(96,165,250,0.06)" } : undefined}
                >
                  <td>
                    <div style={styles.nameCell}>
                      <Rocket
                        size={13}
                        color={entry.is_new ? "var(--color-orange)" : "var(--text-muted)"}
                      />
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {entry.name}
                      </span>
                      {entry.is_new && (
                        <span style={styles.newBadge}>NEW</span>
                      )}
                    </div>
                    {errors[entry.id] && (
                      <div style={{ fontSize: 11, color: "var(--color-red)", marginTop: 2 }}>
                        {errors[entry.id]}
                      </div>
                    )}
                  </td>
                  <td style={{ color: "var(--text-secondary)", fontSize: 12 }}>
                    {entry.location_type}
                  </td>
                  <td>
                    <SignerBadge status={entry.signer_status} />
                  </td>
                  <td>
                    <span style={{ color: entry.enabled ? "var(--color-green)" : "var(--text-muted)", fontWeight: 600, fontSize: 12 }}>
                      {entry.enabled ? "Yes" : "No"}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {formatDistanceToNow(new Date(entry.first_seen_at), { addSuffix: true })}
                  </td>
                  <td
                    className="mono"
                    style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {entry.path}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", color: aiEntry?.id === entry.id ? "var(--color-blue)" : "var(--text-muted)" }}
                        onClick={() => openAi(entry)}
                        title="Ask AI about this entry"
                      >
                        <Bot size={14} />
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "4px 8px", color: "var(--color-red)", opacity: removing.has(entry.id) ? 0.5 : 1 }}
                        disabled={removing.has(entry.id)}
                        onClick={() => handleRemove(entry.id, entry.name, entry.location_type)}
                        title="Remove from startup"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {allEntries.length === 0 && (
            <p style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
              No startup entries found
            </p>
          )}
        </div>
      </div>

      {/* AI Panel */}
      {aiEntry && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Bot size={14} color="var(--color-blue)" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Ask AI about <span className="mono">{aiEntry.name}</span></span>
            <button
              className="btn btn-ghost"
              style={{ marginLeft: "auto", padding: "2px 6px" }}
              onClick={() => setAiEntry(null)}
            >
              <X size={13} />
            </button>
          </div>

          {/* Suggested questions */}
          {aiMessages.length === 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {[
                "Is this startup entry safe?",
                "What does this program do?",
                "Should I remove this?",
                "Why is this unsigned?",
              ].map((q) => (
                <button
                  key={q}
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: "4px 10px" }}
                  onClick={() => handleAskAi(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "82%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: msg.role === "user" ? "rgba(59,130,246,0.15)" : "var(--bg-secondary)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.text}
              </div>
            ))}
            {aiLoading && (
              <div style={{ alignSelf: "flex-start", color: "var(--text-muted)", fontSize: 12, padding: "4px 8px" }}>
                Thinking…
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder={`Ask about ${aiEntry.name}…`}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskAi()}
              disabled={aiLoading}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleAskAi()}
              disabled={aiLoading || !aiInput.trim()}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SignerBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Signed: "var(--color-green)",
    Unsigned: "var(--color-yellow)",
    InvalidSignature: "var(--color-red)",
    Unknown: "var(--text-muted)",
  };
  return (
    <span style={{ color: map[status] ?? "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  newAlert: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.25)",
    borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: 14,
    fontSize: 13, color: "var(--color-orange)", fontWeight: 500,
  },
  nameCell: { display: "flex", alignItems: "center", gap: 6 },
  newBadge: {
    fontSize: 10, fontWeight: 700, color: "var(--color-orange)",
    background: "rgba(249,115,22,0.12)", padding: "1px 5px",
    borderRadius: 4, textTransform: "uppercase" as const,
  },
};
