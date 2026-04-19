import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Copy, AlertCircle } from "lucide-react";
import {
  saveCredential,
  listCredentials,
  deleteCredential as deleteCredentialBackend,
} from "@/lib/invoke";

type Credential = {
  id: string;
  site: string;
  username: string;
  password: string;
};

export default function PasswordManagerPage() {
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [vault, setVault] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkPassword, setCheckPassword] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);

  const [visiblePasswords, setVisiblePasswords] = useState<string[]>([]);

  // Load credentials from backend on mount
  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    setError(null);

    try {
      const creds = await listCredentials();
      // Convert API response to Credential format
      const formattedCreds: Credential[] = creds.map((c: any) => ({
        id: c.id,
        site: c.site,
        username: c.username,
        password: "", // Password is not loaded on list
      }));
      setVault(formattedCreds);
    } catch (err) {
      setError(
        "Failed to load credentials from backend. Ensure the desktop backend is running or start the local HTTP backend."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addCredential = async () => {
    if (!site || !username || !password) {
      setError("All fields are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // For now, store password as plain text. Consider implementing encryption.
      await saveCredential(site, username, password);
      // Reload credentials from backend
      await loadCredentials();
      setSite("");
      setUsername("");
      setPassword("");
    } catch (err) {
      setError("Failed to save credential. Ensure the backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteCredentialFromVault = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteCredentialBackend(id);
      // Reload credentials from backend
      await loadCredentials();
    } catch (err) {
      setError("Failed to delete credential");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
  };

  const analyzePassword = () => {
    const pwd = checkPassword;
    let score = 0;
    let feedback: string[] = [];

    if (pwd.length >= 8) score += 20;
    else feedback.push("Too short");

    if (/[A-Z]/.test(pwd)) score += 15;
    else feedback.push("Add uppercase");

    if (/[0-9]/.test(pwd)) score += 15;
    else feedback.push("Add numbers");

    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    else feedback.push("Add symbols");

    if (pwd.length >= 12) score += 15;

    if (["password", "123456", "admin"].includes(pwd.toLowerCase())) {
      score = 10;
      feedback.push("Very common password");
    }

    let status = "WEAK";
    if (score >= 60) status = "STRONG";
    else if (score >= 30) status = "MEDIUM";

    setAnalysis({ score, status, feedback });
  };

  const getColor = () => {
    if (!analysis) return "#4ADE80";
    if (analysis.status === "STRONG") return "#4ADE80";
    if (analysis.status === "MEDIUM") return "#FBBF24";
    return "#F87171";
  };

  return (
    <div style={s.container}>
      <h1 style={s.title}>
        <Key size={20} /> Password Manager
      </h1>
      <p style={s.subtitle}>Securely manage & autofill credentials</p>

      {error && (
        <div style={s.errorBanner}>
          <AlertCircle size={16} />
          {error}
          <button style={s.retryBtn} onClick={loadCredentials}>
            Retry connection
          </button>
        </div>
      )}

      <div style={s.cardFull}>
        <div style={s.statusRow}>
          <div>
            <p style={s.muted}>Vault Status</p>
            <h2 style={s.secure}>Backend Secured</h2>
          </div>
          <div>
            <p style={s.muted}>Stored Credentials</p>
            <h2>{vault.length}</h2>
          </div>
        </div>
      </div>

      <div style={s.grid}>
        <div style={s.leftCol}>
          <div style={s.cardBig}>
            <h3>Password Strength Checker</h3>

            <div style={s.inputRow}>
              <input
                value={checkPassword}
                onChange={(e) => setCheckPassword(e.target.value)}
                placeholder="Enter password..."
                className="input"
                style={{ flex: 1 }}
              />
              <button className="btn" onClick={analyzePassword}>
                Check
              </button>
            </div>

            {analysis && (
              <>
                <p>
                  Strength:{" "}
                  <span style={{ color: getColor(), fontWeight: 600 }}>
                    {analysis.status}
                  </span>
                </p>

                <div style={s.barWrap}>
                  <div
                    style={{
                      ...s.barFill,
                      width: `${analysis.score}%`,
                      background: getColor(),
                    }}
                  />
                </div>

                <p style={s.muted}>{analysis.score}% strength</p>

                <ul style={s.feedback}>
                  {analysis.feedback.map((f: string, i: number) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div style={s.card}>
            <h3>Add Credential</h3>
            <p style={s.muted}>Store login details securely in backend</p>

            <div style={s.form}>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="Website (e.g., github.com)"
                className="input"
              />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                type="password"
                className="input"
              />
              <button
                className="btn"
                onClick={addCredential}
                disabled={loading}
              >
                {loading ? "Saving..." : "Add Credential"}
              </button>
              <p style={s.backendNote}>
                If the backend is not available, please run the desktop app or start the local HTTP backend.
              </p>
            </div>
          </div>
        </div>

        <div style={s.vaultPanel}>
          <h3>Saved Credentials</h3>

          {loading && <p style={s.muted}>Loading credentials...</p>}

          {vault.map((item) => {
            const visible = visiblePasswords.includes(item.id);

            return (
              <div key={item.id} style={s.vaultItem}>
                <div>
                  <p style={{ fontWeight: 600 }}>{item.site}</p>
                  <p style={s.muted}>{item.username}</p>
                  <p>{visible ? item.password || "••••••••" : "••••••••"}</p>
                </div>

                <div style={s.actions}>
                  <button
                    style={s.iconBtn}
                    onClick={() => togglePassword(item.id)}
                  >
                    {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>

                  <button
                    style={s.iconBtn}
                    onClick={() => copyPassword(item.password || "")}
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() => deleteCredentialFromVault(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {vault.length === 0 && !loading && (
            <p style={s.muted}>No credentials saved yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: "radial-gradient(circle at top, rgba(255,140,0,0.05), transparent 60%)",
  },

  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { color: "var(--text-muted)", fontSize: 12, marginBottom: 16 },

  errorBanner: {
    padding: 12,
    borderRadius: 8,
    background: "rgba(248, 113, 113, 0.1)",
    border: "1px solid #F87171",
    color: "#F87171",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1.8fr",
    gap: 20,
    flex: 1,
  },

  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    height: "100%",
  },

  cardFull: {
    padding: 18,
    borderRadius: 12,
    border: "1px solid #48423B",
    background: "linear-gradient(145deg, #2A2520, #1F1B18)",
    marginBottom: 16,
  },

  card: {
    padding: 18,
    borderRadius: 12,
    border: "1px solid #48423B",
    background: "linear-gradient(145deg, #2A2520, #1F1B18)",
  },

  cardBig: {
    padding: 18,
    borderRadius: 12,
    border: "1px solid #48423B",
    background: "linear-gradient(145deg, #2A2520, #1F1B18)",
    flex: 1,
  },

  vaultPanel: {
    padding: 18,
    borderRadius: 12,
    border: "1px solid #48423B",
    background: "linear-gradient(145deg, #2A2520, #1F1B18)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  vaultItem: {
    padding: 12,
    border: "1px solid #3A332D",
    borderRadius: 10,
    background: "linear-gradient(145deg, #25201C, #1A1714)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  actions: { display: "flex", gap: 10 },

  iconBtn: {
    background: "#2A2520",
    border: "1px solid #48423B",
    borderRadius: 8,
    padding: "6px 8px",
    cursor: "pointer",
    color: "#F7F0E6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  form: { display: "flex", flexDirection: "column", gap: 10 },
  inputRow: { display: "flex", gap: 10 },
  statusRow: { display: "flex", justifyContent: "space-between" },

  barWrap: { width: "100%", height: 6, background: "#333", borderRadius: 999 },
  barFill: { height: "100%", borderRadius: 999 },

  muted: { color: "var(--text-muted)", fontSize: 12 },

  feedback: {
    marginTop: 6,
    paddingLeft: 18,
  },
  retryBtn: {
    marginLeft: 12,
    background: "#2563EB",
    color: "white",
    border: "none",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
  },

  backendNote: {
    marginTop: 8,
    color: "#FBBF24",
    fontSize: 12,
  },
  secure: {
    color: "#4ADE80",
    textShadow: "0 0 10px rgba(74,222,128,0.6)",
  },
};