// A portable snapshot in the URL fragment; no account or server is needed.
const MOBILE_SHARE_LIMIT = 100000;
function encodeMobilePreview(snapshot) {
  const json = JSON.stringify({ version: 1, ...snapshot });
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  if (encoded.length > MOBILE_SHARE_LIMIT) throw new Error('方案过大，请使用完整实验 JSON 导出与导入');
  return encoded;
}
function decodeMobilePreview(hash) {
  if (!hash.startsWith('#aime=')) return null;
  const encoded = hash.slice(6);
  if (!encoded || encoded.length > MOBILE_SHARE_LIMIT || !/^[\w-]+$/.test(encoded)) throw new Error('无效的手机预览链接');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  const snapshot = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0))));
  if (snapshot.version !== 1 || !snapshot.baseline || !snapshot.draft || !Array.isArray(snapshot.aimeBoard?.modules)) throw new Error('手机预览方案不完整');
  return snapshot;
}
export { encodeMobilePreview, decodeMobilePreview };
