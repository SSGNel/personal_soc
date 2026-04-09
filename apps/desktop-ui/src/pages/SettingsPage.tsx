import { useEffect, useState } from "react";
import { getSetting, saveSetting, runCleanupNow } from "@/lib/invoke";
import { Trash2, Save, PlayCircle, Eye, EyeOff, Key } from "lucide-react";

const RETENTION_OPTIONS = [
  { label: "Never (keep all)", value: "0" },
  { label: "1 hour", value: "1" },
  { label: "6 hours", value: "6" },
  { label: "12 hours", value: "12" },
  { label: "1 day", value: "24" },
  { label: "3 days", value: "72" },
  { label: "7 days", value: "168" },
  { label: "30 days", value: "720" },
];

export default function SettingsPage() {
  const [retention, setRetention] = useState("0");
  const [retentionSaved, setRetentionSaved] = useState(false);
  const [cleanResult, setCleanResult] = useState<number | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [savingRetention, setSavingRetention] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    getSetting("process_retention_hours")
      .then((v) => { if (v) setRetention(v); })
      .catch(console.error);
    getSetting("groq_api_key")
      .then((v) => { if (v) setApiKey(v); })
      .catch(console.error);
  }, []);

  const handleSaveRetention = async () => {
    setSavingRetention(true);
    setRetentionSaved(false);
    try {
      await saveSetting("process_retention_hours", retention);
      setRetentionSaved(true);
      setTimeout(() => setRetentionSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingRetention(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setSavingKey(true);
    setKeySaved(false);
    try {
      await saveSetting("groq_api_key", apiKey.trim());
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingKey(false);
    }
  };

  const handleCleanNow = async () => {
    const hours = parseInt(retention);
    if (hours === 0) return;
    setCleaning(true);
    setCleanResult(null);
    try {
      const n = await runCleanupNow(hours);
      setCleanResult(n);
    } catch (err) {
      console.error(err);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div>
      <h1 style={styles.pageTitle}>Settings</h1>

      {/* AI Configuration */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <div style={styles.cardHeader}>
          <Key size={15} color="var(--color-blue)" />
          <h2 style={styles.sectionTitle}>AI Assistant</h2>
        </div>
        <p style={styles.description}>
          Threat-Guard ships with AI powered by <strong>Groq (Llama 3.3 70B)</strong> — no setup needed.
          If you want to use your own API key, enter it below and it will take priority.
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Override API Key (optional)</label>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                className="input"
                type={showKey ? "text" : "password"}
                placeholder="gsk_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
                style={{ width: "100%", paddingRight: 36 }}
              />
              <button
                onClick={() => setShowKey(!showKey)}
                style={styles.eyeBtn}
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              className="btn btn-primary"
              style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
              onClick={handleSaveApiKey}
              disabled={savingKey || !apiKey.trim()}
            >
              <Save size={14} />
              {savingKey ? "Saving…" : keySaved ? "Saved!" : "Save"}
            </button>
          </div>
          {apiKey && (
            <p style={{ ...styles.hint, color: "var(--color-green)", marginTop: 6 }}>
              ✓ API key configured — AI assistant is ready to use
            </p>
          )}
        </div>
      </div>

      {/* Data Retention */}
      <div className="card" style={{ maxWidth: 560 }}>
        <h2 style={styles.sectionTitle}>Memory & Data Retention</h2>
        <p style={styles.description}>
          Terminated processes accumulate in the database over time. Set a retention
          window to automatically remove old terminated processes and their metrics.
          Cleanup runs automatically every hour.
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Delete terminated processes older than</label>
          <select
            className="input"
            style={{ width: 220 }}
            value={retention}
            onChange={(e) => setRetention(e.target.value)}
          >
            {RETENTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={styles.actions}>
          <button
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={handleSaveRetention}
            disabled={savingRetention}
          >
            <Save size={14} />
            {savingRetention ? "Saving…" : retentionSaved ? "Saved!" : "Save"}
          </button>

          <button
            className="btn btn-danger"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
            onClick={handleCleanNow}
            disabled={cleaning || retention === "0"}
            title={retention === "0" ? "Select a retention period first" : "Run cleanup immediately"}
          >
            {cleaning ? <PlayCircle size={14} /> : <Trash2 size={14} />}
            {cleaning ? "Cleaning…" : "Clean up now"}
          </button>
        </div>

        {cleanResult !== null && (
          <p style={styles.cleanResult}>
            {cleanResult === 0
              ? "Nothing to clean up — no terminated processes older than the selected window."
              : `Removed ${cleanResult} terminated process record${cleanResult !== 1 ? "s" : ""} from the database.`}
          </p>
        )}

        {retention !== "0" && (
          <p style={styles.hint}>
            Terminated processes last seen more than{" "}
            <strong>{RETENTION_OPTIONS.find(o => o.value === retention)?.label}</strong>{" "}
            ago will be deleted automatically every hour.
          </p>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 20,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
  },
  description: {
    fontSize: 13,
    color: "var(--text-secondary)",
    marginBottom: 20,
    lineHeight: 1.6,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  eyeBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--text-muted)",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  actions: {
    display: "flex",
    gap: 10,
    marginBottom: 16,
  },
  cleanResult: {
    fontSize: 13,
    color: "var(--color-green)",
    padding: "8px 12px",
    background: "rgba(34,197,94,0.08)",
    borderRadius: "var(--radius-md)",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  hint: {
    fontSize: 12,
    color: "var(--text-muted)",
    marginTop: 8,
  },
};
