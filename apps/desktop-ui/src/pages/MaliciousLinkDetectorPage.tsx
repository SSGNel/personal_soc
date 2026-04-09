import { useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";

export default function MaliciousLinkDetectorPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = () => {
    if (!input) return;
    setLoading(true);

    setTimeout(() => {
      const lower = input.toLowerCase();

      let score = 0;

      if (lower.includes("free")) score += 20;
      if (lower.includes("download")) score += 25;
      if (lower.includes("login")) score += 20;
      if (lower.includes("verify")) score += 15;
      if (lower.includes("bank")) score += 15;
      if (lower.includes("secure")) score += 10;

      let status = "SAFE";
      if (score >= 60) status = "MALICIOUS";
      else if (score >= 30) status = "SUSPICIOUS";

      setResult({
        score,
        status,
        reason:
          status === "MALICIOUS"
            ? "Multiple high-risk phishing indicators detected"
            : status === "SUSPICIOUS"
            ? "Some suspicious patterns detected"
            : "No malicious indicators found",
        recommendation:
          status === "MALICIOUS"
            ? "DO NOT VISIT this link"
            : status === "SUSPICIOUS"
            ? "Proceed with caution"
            : "Safe to proceed",
      });

      setLoading(false);
    }, 900);
  };

  const getColor = () => {
    if (!result) return "#4ADE80";
    if (result.status === "MALICIOUS") return "#F87171";
    if (result.status === "SUSPICIOUS") return "#FBBF24";
    return "#4ADE80";
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 style={s.title}>Malicious Link Detector</h1>
      <p style={s.subtitle}>Analyze links for threats and unsafe behavior</p>

      <div className="card" style={s.card}>
        {/* INPUT */}
        <div style={s.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter suspicious link..."
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={handleScan}>
            Scan
          </button>
        </div>

        {/* LOADING */}
        {loading && (
          <p style={s.loading}>
            🔍 Analyzing link...
          </p>
        )}

        {/* RESULT */}
        {result && (
          <div style={s.resultBox}>
            {/* STATUS */}
            <div style={s.header}>
              {result.status === "SAFE" ? (
                <ShieldCheck size={18} color="#4ADE80" />
              ) : (
                <AlertTriangle size={18} color={getColor()} />
              )}

              <span style={{ ...s.status, color: getColor() }}>
                {result.status}
              </span>
            </div>

            {/* SCORE BAR */}
            <div style={s.barWrap}>
              <div
                style={{
                  ...s.barFill,
                  width: `${result.score}%`,
                  background: getColor(),
                }}
              />
            </div>

            <p style={s.score}>{result.score}% Risk Score</p>

            {/* DETAILS */}
            <p><strong>Reason:</strong> {result.reason}</p>
            <p><strong>Recommendation:</strong> {result.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: "var(--text-muted)", fontSize: 12, marginBottom: 16 },
  card: { padding: 16 },
  inputRow: { display: "flex", gap: 10, marginBottom: 12 },

  loading: {
    color: "var(--text-muted)",
    fontSize: 12,
    marginTop: 10,
  },

  resultBox: {
    background: "#2A2520",
    border: "1px solid #48423B",
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  status: {
    fontSize: 14,
    fontWeight: 700,
  },

  barWrap: {
    width: "100%",
    height: 6,
    background: "#333",
    borderRadius: 999,
    marginBottom: 6,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.4s ease",
  },

  score: {
    fontSize: 11,
    color: "var(--text-muted)",
    marginBottom: 10,
  },
};