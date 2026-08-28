// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fetch = require("node-fetch");
const pdf = require("pdf-parse");
const Tesseract = require("tesseract.js");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const PORT = process.env.PARSE_PORT || 3001;

// Optional: Google Document AI client (best OCR for scanned PDFs)
// Requires @google-cloud/documentai and GOOGLE_APPLICATION_CREDENTIALS env var
let docaiClient = null;
const useGoogleDocAI = !!(process.env.GOOGLE_PROJECT_ID && process.env.GOOGLE_LOCATION && process.env.GOOGLE_PROCESSOR_ID);
if (useGoogleDocAI) {
  const { DocumentProcessorServiceClient } = require("@google-cloud/documentai").v1;
  docaiClient = new DocumentProcessorServiceClient();
  console.log("Google Document AI enabled.");
} else {
  console.log("Google Document AI not configured — will fallback to Tesseract for scanned images.");
}

// helper: parse via OpenAI LLM (returns parsed JSON)
async function parseWithOpenAI(ocrText, filenames = "") {
  const system = `You are an assistant that MUST output only valid JSON (no explanation).
Extract fields from OCR text: full_name, dob, fatherName, motherName, aadhar, phone, email, address, city, state, pincode, class10, class12.
Return empty string "" for missing fields. Format dob as YYYY-MM-DD when possible.`;

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Filenames: ${filenames}\n\nOCR_TEXT:\n${ocrText}` }
    ],
    temperature: 0
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  // parse JSON block
  try {
    return JSON.parse(content);
  } catch (err) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("OpenAI returned non-json");
  }
}

// helper: run server-side Tesseract for images (buffer)
async function tesseractOcr(buffer) {
  const { data: { text } } = await Tesseract.recognize(buffer, "eng", { workerPath: "https://unpkg.com/tesseract.js@v4.0.2/dist/worker.min.js" });
  return text || "";
}

// helper: Google Document AI OCR
async function googleDocAiOcr(buffer, mimeType) {
  if (!docaiClient) throw new Error("Document AI not available");
  const projectId = process.env.GOOGLE_PROJECT_ID;
  const location = process.env.GOOGLE_LOCATION;
  const processorId = process.env.GOOGLE_PROCESSOR_ID;
  const name = docaiClient.processorPath(projectId, location, processorId);

  const request = {
    name,
    rawDocument: {
      content: buffer.toString("base64"),
      mimeType: mimeType || "application/pdf"
    }
  };

  const [result] = await docaiClient.processDocument(request);
  // reconstruct text
  const docText = result?.document?.text || "";
  return docText;
}

// endpoint: parse uploaded file(s)
app.post("/api/parse-file", upload.array("files", 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) return res.status(400).json({ error: "No files uploaded" });

    let fullText = "";

    for (const f of files) {
      const mime = f.mimetype || "";
      if (mime === "application/pdf") {
        // try pdf-parse for text PDFs
        try {
          const pdfRes = await pdf(f.buffer);
          const text = (pdfRes.text || "").trim();
          if (text.length > 60) {
            fullText += `\n\n=== ${f.originalname} (pdf text) ===\n${text}`;
            continue;
          }
          // otherwise fallthrough to scanned PDF handling below
        } catch (err) {
          // continue to scanned handling
        }

        // scanned PDF -> use Document AI if configured, else fallback to tesseract (convert pages required)
        if (useGoogleDocAI) {
          const docText = await googleDocAiOcr(f.buffer, "application/pdf");
          fullText += `\n\n=== ${f.originalname} (docai) ===\n${docText}`;
        } else {
          // fallback: we attempt tesseract on the whole PDF buffer (not reliable). Better: require server-side conversion.
          // We'll attempt but warn user.
          try {
            const txt = await tesseractOcr(f.buffer);
            fullText += `\n\n=== ${f.originalname} (tesseract fallback) ===\n${txt}`;
          } catch (err) {
            fullText += `\n\n=== ${f.originalname} ===\n`; // no text
          }
        }
      } else if (mime.startsWith("image/")) {
        // images -> try Tesseract first or Document AI
        if (useGoogleDocAI) {
          const docText = await googleDocAiOcr(f.buffer, mime);
          fullText += `\n\n=== ${f.originalname} (docai) ===\n${docText}`;
        } else {
          const txt = await tesseractOcr(f.buffer);
          fullText += `\n\n=== ${f.originalname} (tesseract) ===\n${txt}`;
        }
      } else {
        // other types: attempt pdf-parse if bytes indicate pdf; else skip
        try {
          const pdfRes = await pdf(f.buffer);
          if ((pdfRes.text || "").trim().length > 20) {
            fullText += `\n\n=== ${f.originalname} (pdf text) ===\n${pdfRes.text}`;
            continue;
          }
        } catch (_) {}
        // unsupported file type
        fullText += `\n\n=== ${f.originalname} ===\n`;
      }
    }

    if (!fullText.trim()) return res.status(200).json({ message: "no_text", note: "No readable text found on files" });

    // parse with OpenAI to structured fields
    if (!OPENAI_KEY) return res.status(500).json({ error: "OpenAI key not configured on server" });
    const parsed = await parseWithOpenAIServer(fullText, files.map(f => f.originalname).join(", "));
    return res.json({ ocrText: fullText, parsed });
  } catch (err) {
    console.error("parse-file error:", err);
    res.status(500).json({ error: err.message });
  }
});

// helper: call OpenAI from server (same as earlier)
async function parseWithOpenAIServer(ocr, filenames = "") {
  const system = `You are a JSON-only extraction assistant. Extract fields: full_name, dob, fatherName, motherName, aadhar, phone, email, address, city, state, pincode, class10, class12. Use empty string for missing fields.`;
  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Filenames: ${filenames}\n\nOCR_TEXT:\n${ocr}` }
    ],
    temperature: 0,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  const assistant = data?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(assistant);
  } catch (err) {
    const match = assistant.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return {}; // best effort
  }
}

app.listen(PORT, () => console.log(`Parse server listening at http://localhost:${PORT}`));