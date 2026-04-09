import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";

export default function PhishingDetectorPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("phishing_history") || "[]");
    setHistory(saved);
  }, []);

  const analyze = (text: string) => {
    const lower = text.toLowerCase();
    let score = 0;
    let reasons: string[] = [];

    const keywords = [
      "login",
      "verify",
      "account",
      "secure",
      "bank",
      "update",
      "password",
      "confirm",
    ];

    keywords.forEach((word) => {
      if (lower.includes(word)) {
        score += 10;
        reasons.push(`Contains "${word}"`);
      }
    });

    if (/\.(ru|xyz|tk|ml|ga|cf)/.test(lower)) {
      score += 25;
      reasons.push("Suspicious domain (.ru/.xyz/etc)");
    }

    if (/https?:\/\/\d+\.\d+\.\d+\.\d+/.test(lower)) {
      score += 30;
      reasons.push("Uses IP address instead of domain");
    }

    if (lower.length > 40) {
      score += 10;
      reasons.push("Unusually long URL");
    }

    if ((lower.match(/-/g) || []).length > 3) {
      score += 15;
      reasons.push("Too many hyphens (common phishing trick)");
    }

    if (lower.includes("@")) {
      if (lower.includes("support") || lower.includes("security")) {
        score += 10;
        reasons.push("Impersonation-style email");
      }
    }

    // ✅ FIX: CAP SCORE
    score = Math.min(score, 100);

    let status = "SAFE";
    if (score >= 70) status = "MALICIOUS";
    else if (score >= 35) status = "SUSPICIOUS";

    return { score, status, reasons };
  };

  const handleScan = () => {
    if (!input) return;
    setLoading(true);

    setTimeout(() => {
      const res = analyze(input);
      setResult(res);

      const newItem = {
        input,
        ...res,
        time: new Date().toLocaleTimeString(),
      };

      const updated = [newItem, ...history].slice(0, 8);
      setHistory(updated);
      localStorage.setItem("phishing_history", JSON.stringify(updated));

      setLoading(false);
    }, 600);
  };

  const deleteItem = (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    setHistory(updated);
    localStorage.setItem("phishing_history", JSON.stringify(updated));
  };

  const clearAll = () => {
    setHistory([]);
    localStorage.removeItem("phishing_history");
  };

  const getColor = (status: string) => {
    if (status === "MALICIOUS") return "#F87171";
    if (status === "SUSPICIOUS") return "#FBBF24";
    return "#4ADE80";
  };

  return (
    <div style={{ maxWidth: 1200 }}>
      <h1 style={s.title}>Phishing Detector</h1>
      <p style={s.subtitle}>
        Detect phishing attempts in URLs or emails
      </p>

      <div style={s.card}>
        {/* INPUT */}
        <div style={s.inputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter URL or email..."
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn" onClick={handleScan}>
            Scan
          </button>
        </div>

        {loading && <p style={s.loading}>🔍 Smart scanning...</p>}

        {/* RESULT */}
        {result && (
          <div style={s.resultBox}>
            <div style={s.header}>
              {result.status === "SAFE" ? (
                <ShieldCheck size={18} color="#4ADE80" />
              ) : (
                <AlertTriangle size={18} color={getColor(result.status)} />
              )}
              <span style={{ color: getColor(result.status), fontWeight: 700 }}>
                {result.status}
              </span>
            </div>

            <div style={s.barWrap}>
              <div
                style={{
                  ...s.barFill,
                  width: `${Math.min(result.score, 100)}%`,
                  background: getColor(result.status),
                }}
              />
            </div>

            <p style={s.score}>{result.score}% Risk Score</p>

            {/* ✅ FIXED BULLETS */}
            <ul style={s.reasons}>
              {result.reasons.map((r: string, i: number) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {/* HISTORY */}
        {history.length > 0 && (
          <div style={s.historySection}>
            <div style={s.historyHeader}>
              <h3>Recent Scans</h3>
              <button onClick={clearAll} style={s.clearBtn}>
                Clear All
              </button>
            </div>

            {history.map((item, i) => (
              <div key={i} style={s.historyItem}>
                <div>
                  <p style={s.historyText}>{item.input}</p>
                  <p style={s.muted}>{item.time}</p>
                </div>

                <div style={s.historyRight}>
                  <span style={{ color: getColor(item.status) }}>
                    {item.score}%
                  </span>

                  <X
                    size={16}
                    style={s.deleteIcon}
                    onClick={() => deleteItem(i)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  title: { fontSize: 24, fontWeight: 700 },

  subtitle: {
    color: "var(--text-muted)",
    fontSize: 12,
    marginBottom: 18,
  },

  card: {
    padding: 20,
    borderRadius: 14,
    border: "1px solid #48423B",
    background: "linear-gradient(145deg, #2A2520, #1F1B18)",
  },

  inputRow: { display: "flex", gap: 12, marginBottom: 14 },

  loading: { color: "#aaa", fontSize: 12 },

  resultBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    border: "1px solid #333",
    background: "#1F1B18",
  },

  header: { display: "flex", gap: 8, alignItems: "center" },

  barWrap: {
    height: 6,
    background: "#333",
    borderRadius: 999,
    margin: "6px 0",
  },

  barFill: { height: "100%", borderRadius: 999 },

  score: { fontSize: 11, color: "#aaa" },

  reasons: {
    marginTop: 10,
    paddingLeft: 18,
    fontSize: 12,
    color: "#ccc",
  },

  historySection: { marginTop: 20 },

  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  clearBtn: {
    background: "transparent",
    border: "1px solid #444",
    borderRadius: 6,
    padding: "4px 10px",
    color: "#aaa",
    cursor: "pointer",
  },

  historyItem: {
    background: "#1F1B18",
    border: "1px solid #333",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  historyText: { fontWeight: 600 },

  historyRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  deleteIcon: {
    cursor: "pointer",
    color: "#888",
  },

  muted: { fontSize: 11, color: "#888" },
};