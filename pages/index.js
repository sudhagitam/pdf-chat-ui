import { useState, useRef } from "react";

// Load voices early
if (typeof window !== "undefined") {
  window.speechSynthesis.getVoices();
}

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
  const [searchMode, setSearchMode] = useState("pdf");
  const recognitionRef = useRef(null);

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
    if (!question) return;
    setLoading(true);
    setAnswer("");
    try {
      const endpoint = searchMode === "pdf" ? "/ask" : "/ask-groq";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setAnswer(data.answer);
      speakAnswer(data.answer);
    } catch (err) {
      setAnswer("Error getting answer. Try again.");
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
      const transcript = event.results[0][0].transcript;
      setQuestion(transcript);
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

    // Split into smaller sentences for smoother speech
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    let index = 0;
    const speakNext = () => {
      if (index >= sentences.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
      utterance.lang = "en-US";
      utterance.rate = 0.9;   // slightly slower = clearer
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Pick a clear voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        v.name.includes("Google US English") || 
        v.name.includes("Microsoft David") ||
        v.name.includes("Microsoft Zira")
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        index++;
        speakNext(); // speak next sentence
      };
      utterance.onerror = () => {
        index++;
        speakNext();
      };
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };
  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "white", padding: "2rem" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>

        {/* Header */}
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
          📄 PDF Chat AI
        </h1>
        <p style={{ color: "#888", marginBottom: "2rem" }}>
          Upload a PDF and ask questions using Groq AI — with voice support!
        </p>

        {/* Upload Section */}
        <div style={{ background: "#111", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #222" }}>
          <h2 style={{ marginBottom: "1rem" }}>1. Upload Your PDF</h2>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ display: "block", marginBottom: "1rem", color: "#ccc" }}
          />
          <button
            onClick={uploadPDF}
            disabled={!file || uploading}
            style={{
              background: file && !uploading ? "#2563eb" : "#1e3a6e",
              color: "white",
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              cursor: file && !uploading ? "pointer" : "not-allowed",
              fontSize: "1rem"
            }}
          >
            {uploading ? "⏳ Uploading..." : "⬆️ Upload PDF"}
          </button>

          {/* Upload Progress */}
          {uploading && (
            <div style={{ marginTop: "1rem" }}>
              <p style={{ color: "#f59e0b" }}>⏳ Processing PDF... this may take 1-2 minutes for large files.</p>
              <div style={{ width: "100%", height: "4px", background: "#333", borderRadius: "2px", marginTop: "0.5rem", overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  background: "#2563eb",
                  borderRadius: "2px",
                  animation: "loading 2s infinite",
                  width: "40%"
                }} />
              </div>
              <style>{`@keyframes loading { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
            </div>
          )}

          {uploaded && (
            <p style={{ color: "#4ade80", marginTop: "0.75rem" }}>✅ PDF uploaded and ready!</p>
          )}
        </div>

        {/* Question Section */}
        <div style={{ background: "#111", borderRadius: "12px", padding: "1.5rem", border: "1px solid #222" }}>
          <h2 style={{ marginBottom: "1rem" }}>2. Ask a Question</h2>

          {/* Search Mode Toggle */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button
              onClick={() => setSearchMode("pdf")}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "8px",
                border: "2px solid",
                borderColor: searchMode === "pdf" ? "#2563eb" : "#333",
                background: searchMode === "pdf" ? "#1e3a6e" : "transparent",
                color: "white",
                cursor: "pointer",
                fontWeight: searchMode === "pdf" ? "bold" : "normal",
                fontSize: "0.9rem"
              }}
            >
              📄 Search My PDF
            </button>
            <button
              onClick={() => setSearchMode("groq")}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "8px",
                border: "2px solid",
                borderColor: searchMode === "groq" ? "#7c3aed" : "#333",
                background: searchMode === "groq" ? "#3b0764" : "transparent",
                color: "white",
                cursor: "pointer",
                fontWeight: searchMode === "groq" ? "bold" : "normal",
                fontSize: "0.9rem"
              }}
            >
              🌐 Search Groq AI
            </button>
          </div>

          {/* Search mode hint */}
          <p style={{ color: "#666", fontSize: "0.8rem", marginBottom: "1rem" }}>
            {searchMode === "pdf"
              ? "📄 Answers will come from your uploaded PDF only"
              : "🌐 Answers will come from Groq AI general knowledge"}
          </p>

          {/* Input + Mic */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askQuestion()}
              placeholder="Type or speak your question..."
              style={{
                flex: 1,
                background: "#1a1a1a",
                border: "1px solid #333",
                color: "white",
                padding: "0.75rem",
                borderRadius: "8px",
                fontSize: "1rem"
              }}
            />
            <button
              onClick={listening ? stopListening : startListening}
              title="Voice Input"
              style={{
                background: listening ? "#dc2626" : "#7c3aed",
                color: "white",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem"
              }}
            >
              {listening ? "⏹️" : "🎤"}
            </button>
          </div>

          {listening && (
            <p style={{ color: "#a78bfa", marginBottom: "1rem" }}>🎤 Listening... speak now</p>
          )}

          {/* Ask Button + Stop Speaking */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={askQuestion}
              disabled={loading || (searchMode === "pdf" && !uploaded) || !question}
              style={{
                background: !loading && (searchMode === "groq" || uploaded) && question
                  ? searchMode === "pdf" ? "#16a34a" : "#7c3aed"
                  : "#1a1a1a",
                color: "white",
                padding: "0.6rem 1.5rem",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              {loading
                ? "⏳ Thinking..."
                : searchMode === "pdf"
                ? "📄 Ask from PDF"
                : "🌐 Ask Groq AI"}
            </button>

            {speaking && (
              <button
                onClick={stopSpeaking}
                style={{
                  background: "#dc2626",
                  color: "white",
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem"
                }}
              >
                🔇 Stop Speaking
              </button>
            )}
          </div>

          {/* Answer */}
          {answer && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#1a1a1a", borderRadius: "8px", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <p style={{ color: searchMode === "pdf" ? "#4ade80" : "#a78bfa", fontWeight: "bold" }}>
                  {searchMode === "pdf" ? "📄 Answer from PDF:" : "🌐 Answer from Groq AI:"}
                </p>
                <button
                  onClick={() => speakAnswer(answer)}
                  title="Read answer aloud"
                  style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "1.2rem" }}
                >
                  🔊
                </button>
              </div>
              <p style={{ color: "#e5e5e5", lineHeight: "1.6" }}>{answer}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}