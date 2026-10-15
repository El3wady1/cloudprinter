// Input validation. Pure functions, reusable in any project (HTTP, queue, tests).
const PAPERS = ['A4', '80mm', '58mm'];

function validatePrintJob(body = {}) {
  const { printerName, title, lines, paper = 'A4', copies = 1 } = body;
  const bad =
    typeof printerName !== 'string' || !printerName.trim() || printerName.length > 180 ||
    typeof title !== 'string' || !title.trim() || title.length > 160 ||
    !Array.isArray(lines) || lines.length === 0 || lines.length > 60 ||
    lines.some((x) => typeof x !== 'string' || x.length > 240) ||
    !PAPERS.includes(paper) ||
    !Number.isInteger(copies) || copies < 1 || copies > 5;
  if (bad) return { error: 'Invalid job fields' };
  return { value: { printerName: printerName.trim(), title: title.trim(), lines, paper, copies } };
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
