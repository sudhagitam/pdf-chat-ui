import { useState, useRef, useEffect } from "react";

const API = "https://ai-engineer-production-1b5a.up.railway.app";

export default function Home() {
  const [question, setQuestion]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [file, setFile]               = useState(null);
  const [uploaded, setUploaded]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [listening, setListening]     = useState(false);
  const [speaking, setSpeaking]       = useState(false);
  const [searchMode, setSearchMode]   = useState("groq");
  const [history, setHistory]         = useState([]);
  const [sources, setSources]         = useState([]);
  const [targetUrl, setTargetUrl]     = useState("");
  const [alertStatus, setAlertStatus] = useState("");
  const recognitionRef = useRef(null);
  const chatEndRef     = useRef(null);

  if (typeof window !== "undefined") {
    window.speechSynthesis.getVoices();
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  // ── Refresh ──────────────────────────────
  const handleRefresh = () => {
    window.speechSynthesis.cancel();
    setQuestion("");
    setFile(null);
    setUploaded(false);
    setUploading(false);
    setListening(false);
    setSpeaking(false);
    setSearchMode("groq");
    setHistory([]);
    setSources([]);
    setTargetUrl("");
    setAlertStatus("");
  };

  // ── Upload PDF ───────────────────────────
  const uploadPDF = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res  = await fetch(`${API}/upload`, { method: "POST", body: formData });
      const data = await res.json();
      setUploaded(true);
      alert(data.message);
    } catch {
      alert("Upload failed. Check your connection.");
    }
    setUploading(false);
  };

  // ── Ask Question ─────────────────────────
  const askQuestion = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setSources([]);

    const newHistory = [...history, { role: "user", content: question }];
    setHistory(newHistory);
    setQuestion("");

    try {
      let endpoint, body;

      if (searchMode === "web") {
        endpoint = "/search-web";
        body     = { question, history };
      } else if (searchMode === "url") {
        endpoint = "/fetch-url";
        body     = { url: targetUrl, question, history };
      } else if (searchMode === "pdf") {
        endpoint = "/ask";
        body     = { question, history };
      } else {
        endpoint = "/ask-groq";
        body     = { question, history };
      }

      const res  = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.sources) setSources(data.sources);

      setHistory([...newHistory, { role: "assistant", content: data.answer }]);
      speakAnswer(data.answer);

    } catch {
      setHistory([...newHistory, {
        role: "assistant",
        content: "❌ Error getting answer. Please try again."
      }]);
    }
    setLoading(false);
  };

  // ── Voice Input ──────────────────────────
  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported. Please use Chrome.");
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart  = () => setListening(true);
    recognition.onend    = () => setListening(false);
    recognition.onresult = (e) => setQuestion(e.results[0][0].transcript);
    recognition.onerror  = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // ── Voice Output ─────────────────────────
  const speakAnswer = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let index = 0;
    const speakNext = () => {
      if (index >= sentences.length) { setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(sentences[index].trim());
      u.lang = "en-US"; u.rate = 0.9; u.pitch = 1; u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes("Google US English") ||
        v.name.includes("Microsoft David") ||
        v.name.includes("Microsoft Zira")
      );
      if (preferred) u.voice = preferred;
      u.onstart = () => setSpeaking(true);
      u.onend   = () => { index++; speakNext(); };
      u.onerror = () => { index++; speakNext(); };
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  // ── USCIS Alert Trigger ──────────────────
  const triggerUscisCheck = async () => {
    setAlertStatus("⏳ Checking USCIS news...");
    try {
      const res  = await fetch(`${API}/trigger-uscis-check`, { method: "POST" });
      const data = await res.json();
      setAlertStatus("✅ Check triggered! Email sent successfully if new news found.");
    } catch {
      setAlertStatus("❌ Failed to trigger check.");
    }
    setTimeout(() => setAlertStatus(""), 5000);
  };

  // ── Mode Config ──────────────────────────
  const modeConfig = {
    groq: { label: "🌐 Groq AI",    color: "#7c3aed", bg: "#3b0764", hint: "Chat with Groq AI — general knowledge" },
    pdf:  { label: "📄 PDF Chat",   color: "#2563eb", bg: "#1e3a6e", hint: "Chat with your uploaded PDF" },
    url:  { label: "🌍 URL Chat",   color: "#f59e0b", bg: "#451a03", hint: "Chat with any webpage" },
    web:  { label: "🔍 Web Search", color: "#10b981", bg: "#064e3b", hint: "Real-time web search via Tavily" },
  };

  const isAskDisabled =
    loading ||
    (searchMode === "pdf" && !uploaded) ||
    (searchMode === "url" && !targetUrl) ||
    !question.trim();

  const askBtnColor =
    !isAskDisabled ? modeConfig[searchMode].color : "#222";

  const askBtnLabel =
    loading           ? "⏳"
    : searchMode === "pdf" ? "📄 Ask PDF"
    : searchMode === "url" ? "🌍 Ask URL"
    : searchMode === "web" ? "🔍 Search"
    : "🌐 Ask Groq";

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "1.5rem" }}>
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>📄 PDF Chat AI</h1>
            <p style={{ color: "#888", margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>
              Chat with PDF, URL, Web or Groq AI — with voice!
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {/* USCIS Alert Button */}
              <button
                onClick={triggerUscisCheck}
                title="Check USCIS news now & email alert"
                style={{
                  background: "#064e3b", border: "1px solid #10b981",
                  color: "white", padding: "0.5rem 0.8rem",
                  borderRadius: "8px", cursor: "pointer", fontSize: "0.8rem"
                }}
              >
                🚨 USCIS Alert
              </button>
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                style={{
                  background: "#1a1a1a", border: "1px solid #333",
                  color: "white", padding: "0.5rem 1rem",
                  borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem"
                }}
              >
                🔄 Refresh
              </button>
            </div>
            {alertStatus && (
              <p style={{ color: "#10b981", fontSize: "0.75rem", margin: 0 }}>
                {alertStatus}
              </p>
            )}
          </div>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
          {Object.entries(modeConfig).map(([mode, config]) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              style={{
                padding: "0.6rem 0.4rem", borderRadius: "8px",
                border: "2px solid",
                borderColor: searchMode === mode ? config.color : "#333",
                background: searchMode === mode ? config.bg : "transparent",
                color: "white", cursor: "pointer",
                fontWeight: searchMode === mode ? "bold" : "normal",
                fontSize: "0.8rem", transition: "all 0.2s"
              }}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Mode Hint */}
        <p style={{ color: "#555", fontSize: "0.78rem", marginBottom: "1rem" }}>
          {modeConfig[searchMode].hint}
        </p>

        {/* ── PDF Upload ── */}
        {searchMode === "pdf" && (
          <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #222" }}>
            <h2 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>📁 Upload Your PDF</h2>
            <input
              type="file" accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              style={{ display: "block", marginBottom: "0.75rem", color: "#ccc" }}
            />
            <button
              onClick={uploadPDF}
              disabled={!file || uploading}
              style={{
                background: file && !uploading ? "#2563eb" : "#1e3a6e",
                color: "white", padding: "0.5rem 1.25rem",
                borderRadius: "8px", border: "none",
                cursor: file && !uploading ? "pointer" : "not-allowed",
                fontSize: "0.9rem"
              }}
            >
              {uploading ? "⏳ Uploading..." : "⬆️ Upload PDF"}
            </button>
            {uploading && (
              <div style={{ marginTop: "0.75rem" }}>
                <p style={{ color: "#f59e0b", fontSize: "0.8rem" }}>
                  ⏳ Processing... may take 1-2 min for large files.
                </p>
                <div style={{ width: "100%", height: "4px", background: "#333", borderRadius: "2px", marginTop: "0.4rem", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#2563eb", borderRadius: "2px", animation: "loading 2s infinite", width: "40%" }} />
                </div>
                <style>{`@keyframes loading { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }`}</style>
              </div>
            )}
            {uploaded && (
              <p style={{ color: "#4ade80", marginTop: "0.5rem", fontSize: "0.85rem" }}>✅ PDF ready!</p>
            )}
          </div>
        )}

        {/* ── URL Input ── */}
        {searchMode === "url" && (
          <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #f59e0b44" }}>
            <h2 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>🌍 Enter URL</h2>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com"
              style={{
                width: "100%", background: "#1a1a1a",
                border: "1px solid #f59e0b",
                color: "white", padding: "0.75rem",
                borderRadius: "8px", fontSize: "0.9rem",
                boxSizing: "border-box"
              }}
            />
            <p style={{ color: "#f59e0b", fontSize: "0.75rem", marginTop: "0.4rem" }}>
              🌍 AI will read this page and answer your questions
            </p>
          </div>
        )}

        {/* ── Chat History ── */}
        {history.length > 0 && (
          <div style={{
            background: "#111", borderRadius: "12px",
            padding: "1rem", marginBottom: "1rem",
            border: "1px solid #1a1a1a", maxHeight: "450px",
            overflowY: "auto"
          }}>
            <p style={{ color: "#333", fontSize: "0.7rem", marginBottom: "0.75rem" }}>
              💬 {Math.floor(history.length / 2)} exchange{Math.floor(history.length / 2) !== 1 ? "s" : ""}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((msg, i) => (
                <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    padding: "0.75rem 1rem",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "#1e3a6e" : "#1a1a1a",
                    border: `1px solid ${msg.role === "user" ? "#2563eb33" : "#2a2a2a"}`,
                    maxWidth: "82%"
                  }}>
                    <p style={{
                      color: msg.role === "user" ? "#93c5fd" : modeConfig[searchMode].color,
                      fontSize: "0.7rem", fontWeight: "bold", margin: "0 0 0.3rem 0"
                    }}>
                      {msg.role === "user" ? "👤 You" : modeConfig[searchMode].label}
                    </p>
                    <p style={{ color: "#e5e5e5", lineHeight: "1.55", fontSize: "0.92rem", margin: 0 }}>
                      {msg.content}
                    </p>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => speakAnswer(msg.content)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.8rem", marginTop: "0.4rem", padding: 0, color: "#444" }}
                      >
                        🔊 replay
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Sources */}
              {sources.length > 0 && (
                <div style={{ padding: "0.6rem 0.8rem", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #1a1a1a" }}>
                  <p style={{ color: "#444", fontSize: "0.7rem", marginBottom: "0.3rem" }}>🔗 Sources:</p>
                  {sources.map((src, i) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer"
                      style={{
                        display: "block", color: "#10b981",
                        fontSize: "0.72rem", marginBottom: "0.2rem",
                        textDecoration: "none", overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap"
                      }}
                    >
                      {i + 1}. {src}
                    </a>
                  ))}
                </div>
              )}

              {/* Thinking bubble */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "18px 18px 18px 4px", background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                    <p style={{ color: "#555", margin: 0, fontSize: "0.88rem" }}>⏳ Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* ── Input Area ── */}
        <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", border: "1px solid #1a1a1a" }}>

          {/* Textarea */}
          <div style={{ position: "relative", marginBottom: "0.75rem" }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              placeholder={
                searchMode === "pdf" ? "Ask about your PDF... (Enter to send)"
                : searchMode === "url" ? "Ask about the URL... (Enter to send)"
                : searchMode === "web" ? "Search the web... e.g. USCIS news today"
                : "Ask Groq AI anything... (Enter to send)"
              }
              rows={3}
              style={{
                width: "100%", background: "#1a1a1a",
                border: `1px solid ${modeConfig[searchMode].color}44`,
                color: "white", padding: "0.75rem",
                paddingRight: "2.5rem", borderRadius: "8px",
                fontSize: "0.95rem", resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
                lineHeight: "1.5"
              }}
            />
            {question && (
              <button
                onClick={() => setQuestion("")}
                style={{
                  position: "absolute", top: "0.5rem", right: "0.5rem",
                  background: "#333", border: "none", color: "#aaa",
                  borderRadius: "50%", width: "22px", height: "22px",
                  cursor: "pointer", fontSize: "0.75rem",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >✕</button>
            )}
          </div>

          {listening && (
            <p style={{ color: "#a78bfa", marginBottom: "0.5rem", fontSize: "0.82rem" }}>
              🎤 Listening... speak now
            </p>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={askQuestion}
              disabled={isAskDisabled}
              style={{
                background: askBtnColor, color: "white",
                padding: "0.6rem 1.25rem", borderRadius: "8px",
                border: "none", cursor: isAskDisabled ? "not-allowed" : "pointer",
                fontSize: "0.95rem", fontWeight: "bold"
              }}
            >
              {askBtnLabel}
            </button>

            <button
              onClick={listening ? stopListening : startListening}
              style={{
                background: listening ? "#dc2626" : "#7c3aed",
                color: "white", padding: "0.6rem 1rem",
                borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "0.9rem"
              }}
            >
              {listening ? "⏹️ Stop" : "🎤 Speak"}
            </button>

            {speaking && (
              <button
                onClick={stopSpeaking}
                style={{
                  background: "#dc2626", color: "white",
                  padding: "0.6rem 1rem", borderRadius: "8px",
                  border: "none", cursor: "pointer", fontSize: "0.9rem"
                }}
              >
                🔇 Stop
              </button>
            )}

            <button
              onClick={() => { setQuestion(""); setHistory([]); setSources([]); }}
              style={{
                background: "#1a1a1a", color: "#666",
                padding: "0.6rem 1rem", borderRadius: "8px",
                border: "1px solid #2a2a2a", cursor: "pointer",
                fontSize: "0.9rem", marginLeft: "auto"
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <p style={{ color: "#2a2a2a", fontSize: "0.7rem", textAlign: "center", marginTop: "0.75rem" }}>
            {Math.floor(history.length / 2)} exchanges • Refresh to start over
          </p>
        )}

      </div>
    </main>
  );
}
