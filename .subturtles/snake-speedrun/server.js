const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function respond(res, code, body, headers = {}) {
  res.writeHead(code, headers);
  res.end(body);
}

function fileFromURL(url) {
  if (url === "/") {
    return path.join(ROOT, "index.html");
  }
  return path.join(ROOT, decodeURIComponent(url));
}

const server = http.createServer((req, res) => {
  const requestURL = req.url || "/";
  const safeURL = requestURL.split("?")[0];

  if (safeURL.includes("..")) {
    return respond(res, 403, "Forbidden");
  }

  const filePath = fileFromURL(safeURL);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        return respond(res, 404, "Not found");
      }
      console.error(error);
      return respond(res, 500, "Server error");
    }
    respond(res, 200, data, { "Content-Type": contentType });
  });
});

server.listen(PORT, () => {
  console.log(`snake-speedrun server running at http://localhost:${PORT}`);
});
