// main.ts

const TARGET_BASE_URL = "https://aiplatform.googleapis.com/v1/publishers/google/models";

// 1. 获取 Render 分配的端口，如果没有则默认 8000
const port = Deno.env.get("PORT") ? parseInt(Deno.env.get("PORT")!) : 8000;

console.log(`Server running on port ${port}`);

// 2. 在 serve 配置中明确传入 port
Deno.serve({ port }, async (req: Request) => {
  const url = new URL(req.url);

  // --- 你的原有逻辑开始 ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-goog-api-key",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    let apiKey = req.headers.get("x-goog-api-key");
    if (!apiKey) {
      apiKey = url.searchParams.get("key");
    }

    if (!apiKey) {
      return new Response("Missing API Key (x-goog-api-key header or key query param)", { status: 401 });
    }

    // 修复：确保你的正则匹配逻辑是正确的，这里保留你原有的逻辑
    const pathRegex = /models\/([^:]+)(:.*)$/; 
    const match = url.pathname.match(pathRegex);

    if (!match) {
      // 提示：Render 可能会有健康检查请求，这里可以加个判断忽略 / 路径
      if (url.pathname === "/" || url.pathname === "/health") {
          return new Response("Proxy is running", { status: 200 });
      }
      return new Response(`Invalid URL format. Path: ${url.pathname}`, { status: 400 });
    }

    const modelName = match[1]; 
    const action = match[2];

    const newParams = new URLSearchParams(url.searchParams);
    newParams.set("key", apiKey);

    const targetUrl = `${TARGET_BASE_URL}/${modelName}${action}?${newParams.toString()}`;

    console.log(`[Proxy] Forwarding to: ${targetUrl}`);

    const proxyResponse = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: req.body, 
    });

    return new Response(proxyResponse.body, {
      status: proxyResponse.status,
      headers: {
        "Content-Type": proxyResponse.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error: any) {
    console.error("Proxy Error:", error);
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
  // --- 你的原有逻辑结束 ---
});
