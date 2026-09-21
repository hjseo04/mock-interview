// 양주백석고 AI 모의면접 — 백엔드 (Cloudflare Pages Function)
// 학생 앱이 이곳으로 질문을 보내면, 서버가 학교 API 키로 Gemini를 호출해 답을 돌려줍니다.
// ★ API 키는 이 코드에 넣지 않습니다. Cloudflare Pages 설정의 '환경 변수'에 GEMINI_API_KEY 로 저장하세요.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };

// 사용할 Gemini 모델 (저렴하고 빠른 Flash). 필요하면 여기만 바꾸면 됩니다.
const MODEL = "gemini-3.6-flash";

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const key = env.GEMINI_API_KEY;
    if (!key) {
      return json({ error: "no_key", message: "서버에 GEMINI_API_KEY가 설정되지 않았습니다." }, 500);
    }
    let body;
    try { body = await request.json(); } catch (e) { body = {}; }

    // 학교 입장 코드 검사 (ACCESS_CODE 환경변수가 설정된 경우에만 적용)
    const accessCode = env.ACCESS_CODE;
    if (accessCode && (!body || body.code !== accessCode)) {
      return json({ error: "bad_code", message: "학교 입장 코드가 올바르지 않습니다." }, 403);
    }

    const prompt = (body && typeof body.prompt === "string") ? body.prompt : "";
    if (!prompt.trim()) return json({ error: "no_prompt", message: "prompt가 비어 있습니다." }, 400);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
    });

    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 600);
      return json({ error: "upstream_error", status: upstream.status, message: detail }, 502);
    }
    const data = await upstream.json();
    const cand = (data.candidates || [])[0] || {};
    const parts = (cand.content && cand.content.parts) || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) {
      return json({ error: "empty", message: "AI가 빈 응답을 반환했습니다.", raw: JSON.stringify(data).slice(0, 400) }, 502);
    }
    return json({ text });
  } catch (e) {
    return json({ error: "server_error", message: String((e && e.message) || e).slice(0, 300) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}
