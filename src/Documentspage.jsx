import React, { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import imageCompression from "browser-image-compression";

/*
  DocumentsPage responsibilities:
  - Choose doc template (photo, signature, aadhaar, class10 etc.)
  - Capture (file input) or pick photo, show cropper
  - Produce a final blob resized & compressed to spec
  - Run simple pre-checks (format, size, dimension, bright background)
  - Optionally encrypt client-side then upload to Supabase storage
*/

const TEMPLATES = [
  { id: "photo", label: "Passport Photo", width: 200, height: 230, maxKB: 50, mime: "image/jpeg" },
  { id: "signature", label: "Signature", width: 140, height: 60, maxKB: 20, mime: "image/jpeg" },
  { id: "aadhaar", label: "Aadhaar (scan)", width: 1200, height: 800, maxKB: 200, mime: "image/jpeg" },
  { id: "class10", label: "Class 10 certificate", width: 1200, height: 1600, maxKB: 200, mime: "image/jpeg" },
];

export default function DocumentsPage({ user, showToast, supabase }) {
  const [templateId, setTemplateId] = useState("photo");
  const template = TEMPLATES.find((t) => t.id === templateId);
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [working, setWorking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef();
  const [savedDocs, setSavedDocs] = useState([]);

  const loadDocs = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.storage.from("documents").list(user.id, {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error || !data) return;
    const withUrls = await Promise.all(
      data.map(async (f) => {
        const { data: signed } = await supabase.storage
          .from("documents")
          .createSignedUrl(`${user.id}/${f.name}`, 3600);
        return { ...f, url: signed?.signedUrl };
      })
    );
    setSavedDocs(withUrls);
  }, [supabase, user]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setPreviewUrl(null);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // utility: create an image from src
  const createImage = (url) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });

  // draw cropped area onto canvas then return blob
  async function getCroppedBlob(srcUrl, cropPixels, outW, outH, mime = "image/jpeg", quality = 0.92) {
    const image = await createImage(srcUrl);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");

    // draw white background so JPEG has consistent background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outW, outH);

    // draw the cropped area scaled to output size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    ctx.drawImage(
      image,
      cropPixels.x * scaleX,
      cropPixels.y * scaleY,
      cropPixels.width * scaleX,
      cropPixels.height * scaleY,
      0,
      0,
      outW,
      outH
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mime, quality);
    });
  }

  // simple brightness check sampling corners — returns average brightness 0..255
  async function sampleCornerBrightness(blobOrUrl) {
    const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const img = await createImage(url);
    const cvs = document.createElement("canvas");
    cvs.width = img.naturalWidth;
    cvs.height = img.naturalHeight;
    const ctx = cvs.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const w = cvs.width, h = cvs.height;
    const samplePoints = [
      { x: 10, y: 10 }, { x: w - 10, y: 10 }, { x: 10, y: h - 10 }, { x: w - 10, y: h - 10 }
    ];
    let total = 0;
    for (const p of samplePoints) {
      const d = ctx.getImageData(p.x, p.y, 1, 1).data;
      // brightness formula
      total += 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2];
    }
    return total / samplePoints.length;
  }

  const finalizeAndUpload = async () => {
    if (!src || !croppedAreaPixels) { showToast("Please pick and crop an image"); return; }
    setWorking(true);
    try {
      // create cropped blob at template dimensions
      const outW = template.width;
      const outH = template.height;
      let blob = await getCroppedBlob(src, croppedAreaPixels, outW, outH, template.mime, 0.94);

      // compress to meet size target using browser-image-compression
      const maxBytes = template.maxKB * 1024;
      if (blob.size > maxBytes) {
        const options = { maxSizeMB: maxBytes / (1024 * 1024), useWebWorker: true, maxWidthOrHeight: Math.max(outW, outH) };
        blob = await imageCompression(blob, options);
      }

      // quick filetype and size checks
      if (blob.size > maxBytes) {
        showToast(`Warning: file ${Math.round(blob.size / 1024)}KB still > ${template.maxKB}KB`);
      }

      const brightness = await sampleCornerBrightness(blob);
      if (brightness < 120 && template.id === "photo") {
        // low brightness in corners likely not white background
        showToast("Background looks dark — try with a white/light background");
      }

      // preview
      const preview = URL.createObjectURL(blob);
      setPreviewUrl(preview);

      // prepare upload path
      const filename = `${user?.id || "anon"}/${template.id}-${Date.now()}.jpg`;
      // optional: client-side encryption can be applied here before upload (see helper below)

      if (supabase) {
        // ensure a private bucket 'documents' exists in Supabase storage (create via dashboard)
        const uploadRes = await supabase.storage.from("documents").upload(filename, blob, {
          contentType: template.mime,
          upsert: false,
          cacheControl: "3600",
          // metadata may include exam template
        });
        if (uploadRes.error) throw uploadRes.error;
        showToast("Uploaded to Documents");
        loadDocs();
      } else {
        showToast("Preview ready (Supabase not configured)");
      }
    } catch (err) {
      console.error(err);
      showToast(err?.message || "Failed to process/upload");
    } finally {
      setWorking(false);
    }
  };

  const reset = () => {
    setSrc(null);
    setPreviewUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    inputRef.current && (inputRef.current.value = "");
  };

  return (
    <div className="page-enter page-enter-active">
      <div className="page-header fade-up"><h2>Documents</h2><p className="muted">Scan, crop & compress documents to meet specs.</p></div>

      <div className="glass-card">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          {TEMPLATES.map((t) => (
            <button key={t.id} className={`pill ${templateId === t.id ? "active" : ""}`} onClick={() => { setTemplateId(t.id); reset(); }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
          />
        </div>

        {src ? (
          <div style={{ position: "relative", height: 380, background: "#111", borderRadius: 8, overflow: "hidden" }}>
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={template.width / template.height}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 20 }}>
            <p>Select or capture an image to begin cropping for {template.label}.</p>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={finalizeAndUpload} disabled={working || !src}>
            {working ? "Processing…" : "Process & Upload"}
          </button>
          <button className="btn ghost" onClick={reset}>Reset</button>
          {previewUrl && (
            <a className="btn" href={previewUrl} target="_blank" rel="noreferrer">Open Preview</a>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <p className="muted">Notes: Target {template.width}×{template.height}px, under {template.maxKB}KB.</p>
        </div>
      </div>
    </div>
  );
}
