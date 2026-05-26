const fs   = require('fs');
const path = require('path');

function readJSON(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJSON(file, data) {
  try {
    const tmp = file + '.tmp';
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch {
    // read-only filesystem (e.g. Vercel) — writes are no-ops
  }
}

function readOrder(ref, storeDir) {
  return readJSON(path.join(storeDir, `${ref}.json`));
}

function writeOrder(order, storeDir) {
  writeJSON(path.join(storeDir, `${order.ref}.json`), order);
}

function deleteOrder(ref, storeDir) {
  const file = path.join(storeDir, `${ref}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function readAllOrders(storeDir) {
  if (!fs.existsSync(storeDir)) return [];
  return fs.readdirSync(storeDir)
    .filter(f => f.endsWith('.json'))
    .map(f => { try { return JSON.parse(fs.readFileSync(path.join(storeDir, f), 'utf8')); } catch { return null; } })
    .filter(Boolean);
}

function readUsers(file) {
  return readJSON(file) || { users: [] };
}

function writeUsers(file, db) {
  writeJSON(file, db);
}

module.exports = { readJSON, writeJSON, readOrder, writeOrder, deleteOrder, readAllOrders, readUsers, writeUsers };
