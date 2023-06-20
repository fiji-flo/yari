import { SSE } from "sse.js";

export function explain(context, callback) {
  const source = new SSE("/api/v1/plus/ai/explain", {
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(context),
  });
  source.addEventListener("message", (e: { data: string }) =>
    callback(JSON.parse(e.data))
  );
  source.addEventListener("error", (e) => callback(null, e));
  source.stream();
}
