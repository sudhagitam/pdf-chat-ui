import { useState, useRef, useEffect } from "react";

const API = "https://ai-engineer-production-1b5a.up.railway.app";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [searchMode, setSearchMode] = useState("groq");
  const [history, setHistory] = useState([]);
  const [sources, setSources] = useState([]);
  const [targetUrl, setTargetUrl] = useState("");
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  if (typeof window !== "undefined") {
    window.speechSynthesis.getVoices();
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

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
  };

  const uploadPDF = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setUploaded(true);
      alert(data.message);
    } catch (err) {
      alert("Upload failed. Check your connection.");
    }
    setUploading(false);
  };

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
        body = { question, history };
      } else if (searchMode === "url") {
        endpoint = "/fetch-url";
        body = { url: targetUrl, question, history };
      } else if (searchMode === "pdf") {
        endpoint = "/ask";
        body = { question, history };
      } else {
        endpoint = "/ask-groq";
        body = { question, history };
      }

      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.sources) setSources(data.sources);

      setHistory([...newHistory,
        { role: "assistant", content: data.answer }
      ]);
      speakAnswer(data.answer);

    } catch (err) {
      setHistory([...newHistory,
        { role: "assistant", content: "❌ Error getting answer. Please try again." }
      ]);
    }
    setLoading(false);
  };

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Voice input not supported. Please use Chrome.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onresult = (e) => setQuestion(e.results[0][0].transcript);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const speakAnswer = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let index = 0;
    const speakNext = () => {
      if (index >= sentences.length) { setSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes("Google US English") ||
        v.name.includes("Microsoft David") ||
        v.name.includes("Microsoft Zira")
      );
      if (preferred) utterance.voice = preferred;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => { index++; speakNext(); };
      utterance.onerror = () => { index++; speakNext(); };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const modeConfig = {
    groq:  { label: "🌐 Groq AI",     color: "#7c3aed", bg: "#3b0764", hint: "Chat with Groq AI — general knowledge" },
    pdf:   { label: "📄 PDF Chat",    color: "#2563eb", bg: "#1e3a6e", hint: "Chat with your uploaded PDF" },
    url:   { label: "🌍 URL Chat",    color: "#f59e0b", bg: "#451a03", hint: "Chat with any webpage" },
    web:   { label: "🔍 Web Search",  color: "#10b981", bg: "#064e3b", hint: "Search the web in real-time via Tavily" },
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "1.5rem" }}>
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>
              📄 PDF Chat AI
            </h1>
            <p style={{ color: "#888", margin: "0.25rem 0 0 0", fontSize: "0.85rem" }}>
              Chat with PDF, URL, Web or Groq AI — with voice!
            </p>
          </div>
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

        {/* Mode Toggle — 4 buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1rem" }}>
          {Object.entries(modeConfig).map(([mode, config]) => (
            <button
              key={mode}
              onClick={() => setSearchMode(mode)}
              style={{
                padding: "0.6rem 0.4rem",
                borderRadius: "8px",
                border: "2px solid",
                borderColor: searchMode === mode ? config.color : "#333",
                background: searchMode === mode ? config.bg : "transparent",
                color: "white",
                cursor: "pointer",
                fontWeight: searchMode === mode ? "bold" : "normal",
                fontSize: "0.8rem",
                transition: "all 0.2s"
              }}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Mode Hint */}
        <p style={{ color: "#666", fontSize: "0.8rem", marginBottom: "1rem" }}>
          {modeConfig[searchMode].hint}
        </p>

        {/* PDF Upload — only in PDF mode */}
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
                <style>{`@keyframes loading { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
              </div>
            )}
            {uploaded && <p style={{ color: "#4ade80", marginTop: "0.5rem", fontSize: "0.85rem" }}>✅ PDF ready!</p>}
          </div>
        )}

        {/* URL Input — only in URL mode */}
        {searchMode === "url" && (
          <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #f59e0b44" }}>
            <h2 style={{ marginBottom: "0.75rem", fontSize: "1rem" }}>🌍 Enter URL to Chat With</h2>
            <input
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://prompt-optimizer-basic.vercel.app/"
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

        {/* Chat History */}
        {history.length > 0 && (
          <div style={{
            background: "#111", borderRadius: "12px",
            padding: "1rem", marginBottom: "1rem",
            border: "1px solid #222", maxHeight: "450px",
            overflowY: "auto"
          }}>
            <p style={{ color: "#444", fontSize: "0.72rem", marginBottom: "0.75rem" }}>
              💬 {Math.floor(history.length / 2)} exchange{Math.floor(history.length / 2) !== 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {history.map((msg, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
                }}>
                  <div style={{
                    padding: "0.75rem 1rem",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "#1e3a6e" : "#1a1a1a",
                    border: `1px solid ${msg.role === "user" ? "#2563eb" : "#2a2a2a"}`,
                    maxWidth: "82%"
                  }}>
                    <p style={{
                      color: msg.role === "user" ? "#93c5fd" : modeConfig[searchMode].color,
                      fontSize: "0.7rem", marginBottom: "0.3rem",
                      fontWeight: "bold", margin: "0 0 0.3rem 0"
                    }}>
                      {msg.role === "user" ? "👤 You" : modeConfig[searchMode].label}
                    </p>
                    <p style={{ color: "#e5e5e5", lineHeight: "1.55", fontSize: "0.92rem", margin: 0 }}>
                      {msg.content}
                    </p>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => speakAnswer(msg.content)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.85rem", marginTop: "0.4rem", padding: 0, color: "#555" }}
                      >
                        🔊 replay
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Sources */}
              {sources.length > 0 && (
                <div style={{ padding: "0.6rem 0.8rem", background: "#0d0d0d", borderRadius: "8px", border: "1px solid #222" }}>
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
                  <div style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "18px 18px 18px 4px",
                    background: "#1a1a1a", border: "1px solid #2a2a2a"
                  }}>
                    <p style={{ color: "#555", margin: 0, fontSize: "0.88rem" }}>⏳ Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", border: "1px solid #222" }}>
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
                : searchMode === "url" ? "Ask about the URL content... (Enter to send)"
                : searchMode === "web" ? "Search the web... e.g. latest AI news today"
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
            {/* Ask Button */}
            <button
              onClick={askQuestion}
              disabled={
                loading ||
                (searchMode === "pdf" && !uploaded) ||
                (searchMode === "url" && !targetUrl) ||
                !question.trim()
              }
              style={{
                background: !loading &&
                  (searchMode === "groq" || searchMode === "web" ||
                   (searchMode === "pdf" && uploaded) ||
                   (searchMode === "url" && targetUrl)) &&
                  question.trim()
                  ? modeConfig[searchMode].color : "#222",
                color: "white", padding: "0.6rem 1.25rem",
                borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "0.95rem",
                fontWeight: "bold"
              }}
            >
              {loading ? "⏳" : searchMode === "pdf" ? "📄 Ask PDF"
                : searchMode === "url" ? "🌍 Ask URL"
                : searchMode === "web" ? "🔍 Search"
                : "🌐 Ask Groq"}
            </button>

            {/* Mic */}
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

            {/* Stop Speaking */}
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

            {/* Clear All */}
            <button
              onClick={() => { setQuestion(""); setHistory([]); setSources([]); }}
              style={{
                background: "#1a1a1a", color: "#888",
                padding: "0.6rem 1rem", borderRadius: "8px",
                border: "1px solid #333", cursor: "pointer",
                fontSize: "0.9rem", marginLeft: "auto"
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <p style={{ color: "#333", fontSize: "0.72rem", textAlign: "center", marginTop: "0.75rem" }}>
            {Math.floor(history.length / 2)} exchanges • Refresh to start over
          </p>
        )}

      </div>
    </main>
  );
}