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

function validatePrintJob(body = {}) {
  const { printerName, title, lines, paper = 'A4', copies = 1, kind = 'receipt', sticker } = body;
  const bad =
    typeof printerName !== 'string' || !printerName.trim() || printerName.length > 180 ||
    typeof title !== 'string' || !title.trim() || title.length > 160 ||
    !Array.isArray(lines) || lines.length === 0 || lines.length > 60 ||
    lines.some((x) => typeof x !== 'string' || x.length > 240) ||
    !PAPERS.includes(paper) ||
    !Number.isInteger(copies) || copies < 1 || copies > 5 ||
    !['receipt', 'sticker'].includes(kind);
  if (bad) return { error: 'Invalid job fields' };
  let stickerValue;
  if (kind === 'sticker') {
    const r = validateSticker(sticker);
    if (r.error) return r;
    stickerValue = r.value;
  }
  const value = { printerName: printerName.trim(), title: title.trim(), lines, paper, copies, kind };
  if (stickerValue) value.sticker = stickerValue;
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
