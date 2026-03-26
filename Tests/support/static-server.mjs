import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourcesDir = path.resolve(__dirname, "../../Sources");
const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"]
]);

function getContentType(filePath) {
  return contentTypes.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function resolveFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const normalizedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const candidatePath = path.resolve(sourcesDir, `.${normalizedPath}`);

  if (!candidatePath.startsWith(sourcesDir)) {
    return null;
  }

  return candidatePath;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolveFilePath(request.url ?? "/");

  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  try {
    const stats = await fs.stat(filePath);
    const targetPath = stats.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const fileBuffer = await fs.readFile(targetPath);

    response.writeHead(200, {
      "Content-Type": getContentType(targetPath),
      "Cache-Control": "no-store"
    });
    response.end(fileBuffer);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
  }
});

server.listen(port, host, () => {
  console.log(`Playwright static server listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => {
      process.exit(0);
    });
  });
}