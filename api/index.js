let serverEntry;

async function getServer() {
  if (!serverEntry) {
    const mod = await import('../dist/server/server.js');
    serverEntry = mod.default ?? mod.server;
  }
  return serverEntry;
}

export default async function handler(req, res) {
  const server = await getServer();

  // Convert Node.js req/res to Web Request/Response
  const url = new URL(req.url, `http://${req.headers.host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await new Promise((resolve) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  const response = await server.fetch(request);

  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  const buffer = await response.arrayBuffer();
  res.end(Buffer.from(buffer));
}
