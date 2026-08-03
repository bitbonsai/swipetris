// dependency-free Turso client over the libsql HTTP pipeline API,
// so Pages Functions bundle without any npm install step

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

function toArg(v) {
  if (typeof v === "number" && Number.isInteger(v)) return { type: "integer", value: String(v) };
  if (typeof v === "number") return { type: "float", value: v };
  return { type: "text", value: String(v) };
}

function decode(c) {
  if (c.type === "integer") return Number(c.value);
  if (c.type === "null") return null;
  return c.value;
}

export async function exec(env, sql, args = []) {
  const url = env.TURSO_URL.replace(/^libsql:/, "https:") + "/v2/pipeline";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.TURSO_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        { type: "execute", stmt: { sql, args: args.map(toArg) } },
        { type: "close" },
      ],
    }),
  });
  const data = await res.json();
  const r = data.results?.[0];
  if (!r || r.type !== "ok") throw new Error("turso: " + JSON.stringify(r?.error ?? data));
  const { cols, rows } = r.response.result;
  return rows.map((row) => Object.fromEntries(row.map((c, i) => [cols[i].name, decode(c)])));
}
