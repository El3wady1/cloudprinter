// Input validation. Pure functions, reusable in any project (HTTP, queue, tests).
const PAPERS = ['A4', '80mm', '58mm'];

function numIn(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function validateSticker(s) {
  if (typeof s !== 'object' || s === null) return { error: 'Invalid sticker fields' };
  const { widthMm = 45, heightMm = 35, fontSize = 12, padding = 14 } = s;
  if (!numIn(widthMm, 10, 210) || !numIn(heightMm, 10, 210) || !numIn(fontSize, 5, 32) || !numIn(padding, 0, 40)) {
    return { error: 'Invalid sticker fields' };
  }
  return { value: { widthMm, heightMm, fontSize, padding } };
}

function validatePage(p) {
  if (typeof p !== 'object' || p === null) return { error: 'Invalid page fields' };
  const { widthMm = 101.6, heightMm = 152.4 } = p;
  if (!numIn(widthMm, 10, 220) || !numIn(heightMm, 10, 220)) return { error: 'Invalid page fields' };
  return { value: { widthMm, heightMm } };
}

function validatePrintJob(body = {}) {
  const { printerName, title, lines, paper = 'A4', copies = 1, kind = 'receipt', sticker, html, page } = body;
  const bad =
    typeof printerName !== 'string' || !printerName.trim() || printerName.length > 180 ||
    typeof title !== 'string' || !title.trim() || title.length > 160 ||
    !PAPERS.includes(paper) ||
    !Number.isInteger(copies) || copies < 1 || copies > 5 ||
    !['receipt', 'sticker', 'html'].includes(kind);
  if (bad) return { error: 'Invalid job fields' };
  // lines required for receipt/sticker, optional for html (agent renders job.html as-is)
  let finalLines = lines;
  if (kind === 'html') {
    if (finalLines === undefined) finalLines = [title.trim()];
    if (typeof html !== 'string' || html.length < 50 || html.length > 400000) return { error: 'Invalid html fields' };
  }
  if (!Array.isArray(finalLines) || finalLines.length === 0 || finalLines.length > 60 ||
      finalLines.some((x) => typeof x !== 'string' || x.length > 240)) {
    return { error: 'Invalid job fields' };
  }
  let stickerValue;
  if (kind === 'sticker') {
    const r = validateSticker(sticker);
    if (r.error) return r;
    stickerValue = r.value;
  }
  let pageValue;
  if (kind === 'html') {
    const r = validatePage(page === undefined ? {} : page);
    if (r.error) return r;
    pageValue = r.value;
  }
  const value = { printerName: printerName.trim(), title: title.trim(), lines: finalLines, paper, copies, kind };
  if (stickerValue) value.sticker = stickerValue;
  if (kind === 'html') { value.html = html; value.page = pageValue; }
  return { value };
}

function validateHeartbeat(body = {}, expectedAgentId) {
  if (
    body.agentId !== expectedAgentId ||
    !Array.isArray(body.printers) || body.printers.length > 30 ||
    body.printers.some((x) => typeof x !== 'string' || x.length > 180)
  ) return { error: 'Invalid agent/printers' };
  return { value: { agentId: body.agentId, printers: body.printers } };
}

function validateAckStatus(status) {
  return ['submitted', 'failed'].includes(status) ? null : 'Invalid status';
}

module.exports = { PAPERS, validatePrintJob, validateHeartbeat, validateAckStatus };
