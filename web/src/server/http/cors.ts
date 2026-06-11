const publicCorsHeaders = {
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Max-Age": "86400",
};

export function withPublicCors(headers?: HeadersInit) {
  return {
    ...publicCorsHeaders,
    ...Object.fromEntries(new Headers(headers).entries()),
  };
}

export function publicCorsPreflight() {
  return new Response(null, {
    headers: publicCorsHeaders,
    status: 204,
  });
}
