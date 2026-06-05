import { createServer } from 'node:http';

let handler;

async function getHandler() {
  if (!handler) {
    const mod = await import('../dist/server/server.js');
    handler = mod.default;
  }
  return handler;
}

export default async function (req, res) {
  const h = await getHandler();
  return h(req, res);
}
