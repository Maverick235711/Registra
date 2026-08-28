// WARNING: simple example. Do proper key management in production.
export async function generateKey() {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
export async function exportKey(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}
export async function importKey(b64) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", true, ["encrypt", "decrypt"]);
}
export async function encryptBlob(key, blob) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const arr = new Uint8Array(await blob.arrayBuffer());
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, arr);
  const out = new Blob([iv, new Uint8Array(ct)], { type: "application/octet-stream" });
  return out;
}
export async function decryptBlob(key, blob) {
  const buf = await blob.arrayBuffer();
  const iv = new Uint8Array(buf.slice(0,12));
  const ct = buf.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new Blob([pt]);
}