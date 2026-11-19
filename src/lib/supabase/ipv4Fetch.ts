import https from "node:https";
import { resolve4 } from "node:dns/promises";

function headerRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key === "host") return;
    record[key] = value;
  });
  return record;
}

async function requestBody(input: RequestInfo | URL, init?: RequestInit): Promise<Buffer | undefined> {
  if (typeof init?.body === "string") return Buffer.from(init.body);
  if (init?.body instanceof Uint8Array) return Buffer.from(init.body);
  if (input instanceof Request) {
    const bytes = await input.clone().arrayBuffer();
    return bytes.byteLength > 0 ? Buffer.from(bytes) : undefined;
  }
  return undefined;
}

// Supabase ligger bag IPv6, som Vercel ikke kan bruge. Kaldet går derfor til en IPv4-adresse.
export async function ipv4Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw);
  const addresses = await resolve4(url.hostname);
  const address = addresses[0];
  if (!address) throw new Error("Kunne ikke finde login-serveren.");

  const method = init?.method || (input instanceof Request ? input.method : "GET");
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const body = await requestBody(input, init);
  if (body) headers.set("content-length", String(body.length));

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: address,
        servername: url.hostname,
        port: url.port || 443,
        method,
        path: `${url.pathname}${url.search}`,
        headers: { ...headerRecord(headers), host: url.hostname },
        timeout: 8000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers)) {
            if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(key, item));
            else if (value) responseHeaders.set(key, value);
          }
          resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 500, headers: responseHeaders }));
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Forbindelsen til login-serveren udløb.")));
    if (body) req.write(body);
    req.end();
  });
}
