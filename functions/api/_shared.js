import { createClient } from "@libsql/client/web";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export const db = (env) =>
  createClient({ url: env.TURSO_URL, authToken: env.TURSO_TOKEN });
