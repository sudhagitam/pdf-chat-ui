import { useState, useRef, useEffect } from "react";

const API = "https://ai-engineer-production-1b5a.up.railway.app";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [searchMode, setSearchMode] = useState("groq");
  const [history, setHistory] = useState([]);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  if (typeof window !== "undefined") {
    window.speechSynthesis.getVoices();
  }

  // Auto scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleRefresh = () => {
    window.speechSynthesis.cancel();
    setQuestion("");
    setAnswer("");
    setFile(null);
    setUploaded(false);
    setUploading(false);
    setListening(false);
    setSpeaking(false);
    setSearchMode("groq");
    setHistory([]);
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

    const newHistory = [...history, { role: "user", content: question }];
    setHistory(newHistory);
    setQuestion("");

    try {
      const endpoint = searchMode === "pdf" ? "/ask" : "/ask-groq";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history: history
        }),
      });
      const data = await res.json();

      setHistory([...newHistory,
        { role: "assistant", content: data.answer }
      ]);
      setAnswer(data.answer);
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
    recognition.onresult = (event) => {
      setQuestion(event.results[0][0].transcript);
    };
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

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "1.5rem" }}>
      <div style={{ maxWidth: "750px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "bold", margin: 0 }}>📄 PDF Chat AI</h1>
            <p style={{ color: "#888", margin: "0.25rem 0 0 0", fontSize: "0.9rem" }}>
              Chat with your PDF or ask Groq AI anything — with voice support!
            </p>
          </div>
          <button
            onClick={handleRefresh}
            title="Reset everything"
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search Mode Toggle */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setSearchMode("groq")}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "8px",
              border: "2px solid",
              borderColor: searchMode === "groq" ? "#7c3aed" : "#333",
              background: searchMode === "groq" ? "#3b0764" : "transparent",
              color: "white", cursor: "pointer",
              fontWeight: searchMode === "groq" ? "bold" : "normal",
              fontSize: "0.9rem"
            }}
          >
            🌐 Chat with Groq AI
          </button>
          <button
            onClick={() => setSearchMode("pdf")}
            style={{
              flex: 1, padding: "0.6rem", borderRadius: "8px",
              border: "2px solid",
              borderColor: searchMode === "pdf" ? "#2563eb" : "#333",
              background: searchMode === "pdf" ? "#1e3a6e" : "transparent",
              color: "white", cursor: "pointer",
              fontWeight: searchMode === "pdf" ? "bold" : "normal",
              fontSize: "0.9rem"
            }}
          >
            📄 Chat with PDF
          </button>
        </div>

        {/* PDF Upload - only show in PDF mode */}
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
                <p style={{ color: "#f59e0b", fontSize: "0.85rem" }}>⏳ Processing... may take 1-2 min for large files.</p>
                <div style={{ width: "100%", height: "4px", background: "#333", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "#2563eb", borderRadius: "2px", animation: "loading 2s infinite", width: "40%" }} />
                </div>
                <style>{`@keyframes loading { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
              </div>
            )}
            {uploaded && <p style={{ color: "#4ade80", marginTop: "0.5rem", fontSize: "0.9rem" }}>✅ PDF ready!</p>}
          </div>
        )}

        {/* Chat History */}
        {history.length > 0 && (
          <div style={{
            background: "#111", borderRadius: "12px", padding: "1rem",
            marginBottom: "1rem", border: "1px solid #222",
            maxHeight: "450px", overflowY: "auto"
          }}>
            <p style={{ color: "#555", fontSize: "0.75rem", marginBottom: "0.75rem" }}>
              💬 {history.length / 2} message{history.length / 2 !== 1 ? "s" : ""} in conversation
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
                    border: `1px solid ${msg.role === "user" ? "#2563eb" : "#333"}`,
                    maxWidth: "80%"
                  }}>
                    <p style={{
                      color: msg.role === "user" ? "#93c5fd" : searchMode === "pdf" ? "#4ade80" : "#a78bfa",
                      fontSize: "0.7rem", marginBottom: "0.3rem", fontWeight: "bold"
                    }}>
                      {msg.role === "user" ? "👤 You" : searchMode === "pdf" ? "📄 PDF AI" : "🤖 Groq AI"}
                    </p>
                    <p style={{ color: "#e5e5e5", lineHeight: "1.5", fontSize: "0.92rem", margin: 0 }}>
                      {msg.content}
                    </p>
                    {/* Speak button on AI messages */}
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => speakAnswer(msg.content)}
                        style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.9rem", marginTop: "0.3rem", padding: 0 }}
                      >
                        🔊
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {/* Loading bubble */}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{
                    padding: "0.75rem 1rem", borderRadius: "18px 18px 18px 4px",
                    background: "#1a1a1a", border: "1px solid #333"
                  }}>
                    <p style={{ color: "#666", margin: 0, fontSize: "0.9rem" }}>⏳ Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Input Area */}
        <div style={{ background: "#111", borderRadius: "12px", padding: "1.25rem", border: "1px solid #222" }}>

          <p style={{ color: "#555", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
            {searchMode === "pdf"
              ? "📄 Answers from your uploaded PDF"
              : "🌐 Chatting with Groq AI — no PDF needed"}
          </p>

          {/* Textarea + Clear X */}
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
              placeholder={searchMode === "pdf"
                ? "Ask about your PDF... (Enter to send, Shift+Enter for new line)"
                : "Ask Groq AI anything... (Enter to send, Shift+Enter for new line)"}
              rows={3}
              style={{
                width: "100%", background: "#1a1a1a",
                border: "1px solid #333", color: "white",
                padding: "0.75rem", paddingRight: "2.5rem",
                borderRadius: "8px", fontSize: "0.95rem",
                resize: "vertical", boxSizing: "border-box",
                fontFamily: "inherit", lineHeight: "1.5"
              }}
            />
            {question && (
              <button
                onClick={() => setQuestion("")}
                title="Clear input"
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
            <p style={{ color: "#a78bfa", marginBottom: "0.5rem", fontSize: "0.85rem" }}>🎤 Listening... speak now</p>
          )}

          {/* Buttons Row */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Send */}
            <button
              onClick={askQuestion}
              disabled={loading || (searchMode === "pdf" && !uploaded) || !question.trim()}
              style={{
                background: !loading && (searchMode === "groq" || uploaded) && question.trim()
                  ? searchMode === "pdf" ? "#16a34a" : "#7c3aed"
                  : "#222",
                color: "white", padding: "0.6rem 1.25rem",
                borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "0.95rem"
              }}
            >
              {loading ? "⏳" : searchMode === "pdf" ? "📄 Ask PDF" : "🌐 Ask Groq"}
            </button>

            {/* Mic */}
            <button
              onClick={listening ? stopListening : startListening}
              style={{
                background: listening ? "#dc2626" : "#7c3aed",
                color: "white", padding: "0.6rem 1rem",
                borderRadius: "8px", border: "none",
                cursor: "pointer", fontSize: "0.95rem"
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
                  border: "none", cursor: "pointer", fontSize: "0.95rem"
                }}
              >
                🔇 Stop
              </button>
            )}

            {/* Clear All */}
            <button
              onClick={() => { setQuestion(""); setAnswer(""); setHistory([]); }}
              style={{
                background: "#333", color: "white",
                padding: "0.6rem 1rem", borderRadius: "8px",
                border: "none", cursor: "pointer", fontSize: "0.95rem",
                marginLeft: "auto"
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        {/* Conversation count */}
        {history.length > 0 && (
          <p style={{ color: "#444", fontSize: "0.75rem", textAlign: "center", marginTop: "0.75rem" }}>
            {Math.floor(history.length / 2)} exchanges in this conversation • Refresh to start over
          </p>
        )}

      </div>
    </main>
  );
}