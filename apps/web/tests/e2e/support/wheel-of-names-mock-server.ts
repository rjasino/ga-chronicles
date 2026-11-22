import { createServer } from "node:http";
import { createWheelOfNamesResponse, type MockWheelConfig } from "../fixtures/wheel-of-names.ts";

const requests: { wheelConfig: MockWheelConfig }[] = [];

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "content-type": "text/plain" }).end("ok");
    return;
  }

  if (request.method === "GET" && request.url === "/requests") {
    response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(requests));
    return;
  }

  if (request.method === "DELETE" && request.url === "/requests") {
    requests.length = 0;
    response.writeHead(204).end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/api/v3/wheels/animate") {
    response.writeHead(404).end();
    return;
  }

  let body = "";
  for await (const chunk of request) body += chunk;

  try {
    const payload = JSON.parse(body) as { wheelConfig?: MockWheelConfig };
    if (!payload.wheelConfig?.entries?.length) {
      response.writeHead(400, { "content-type": "application/json" })
        .end(JSON.stringify({ error: "wheelConfig.entries is required" }));
      return;
    }

    requests.push({ wheelConfig: payload.wheelConfig });
    await new Promise((resolve) => setTimeout(resolve, 800));
    response.writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify(createWheelOfNamesResponse(payload.wheelConfig)));
  } catch {
    response.writeHead(400, { "content-type": "application/json" })
      .end(JSON.stringify({ error: "Malformed request" }));
  }
});

server.listen(3201, "127.0.0.1");
