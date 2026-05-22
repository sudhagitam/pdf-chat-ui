"use client";
import { useState } from "react";

const API = "https://ai-engineer-production-1b5a.up.railway.app";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadPDF = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API}/upload`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploaded(true);
    setUploading(false);
    alert(data.message);
  };

  const askQuestion = async () => {
    if (!question) return;
    setLoading(true);
    setAnswer("");
    const res = await fetch(`${API}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">📄 PDF Chat AI</h1>
        <p className="text-gray-400 mb-8">Upload a PDF and ask questions using Groq AI</p>

        {/* Upload Section */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">1. Upload Your PDF</h2>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-4 block text-gray-300"
          />
          <button
            onClick={uploadPDF}
            disabled={!file || uploading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>
          {uploaded && (
            <p className="text-green-400 mt-3">✅ PDF uploaded and ready!</p>
          )}
        </div>

        {/* Question Section */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">2. Ask a Question</h2>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askQuestion()}
            placeholder="What is this document about?"
            className="w-full bg-gray-800 border border-gray-700 text-white p-3 rounded-lg mb-4"
          />
          <button
            onClick={askQuestion}
            disabled={loading || !uploaded}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Thinking..." : "Ask Groq AI"}
          </button>

          {answer && (
            <div className="mt-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-green-400 font-semibold mb-2">Answer:</p>
              <p className="text-gray-200 leading-relaxed">{answer}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}