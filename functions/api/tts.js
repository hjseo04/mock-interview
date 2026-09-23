// 양주백석고 AI 모의면접 — 음성 합성 백엔드 (Cloudflare Pages Function)
// 프론트엔드가 질문 텍스트를 보내면, 서버가 학교 키로 Google Cloud TTS(신경망 음성)를 호출해
// 자연스러운 남/여 한국어 음성(MP3)을 돌려줍니다.
// ★ 키는 이 코드에 넣지 않습니다. Cloudflare Pages 환경 변수에 GOOGLE_TTS_KEY 로 저장하세요.
//   (이 키는 Gemini 키와 별개 — Google Cloud에서 "Cloud Text-to-Speech API"를 켠 키가 필요합니다.)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json; charset=utf-8" };

// 성별별 목소리 (Chirp3-HD = 가장 자연스러운 최신 음성)
const VOICES = { m: "ko-KR-Chirp3-HD-Charon", f: "ko-KR-Chirp3-HD-Aoede" };
// Chirp3가 실패할 경우를 대비한 예비 음성 (Neural2)
const FALLBACK_VOICES = { m: "ko-KR-Neural2-C", f: "ko-KR-Neural2-A" };
const SPEAKING_RATE = 1.0; // 1.0 = 표준 속도(또박또박). 빠르게: 1.1, 느리게: 0.95

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const key = env.GOOGLE_TTS_KEY;
    if (!key) return json({ error: "no_tts_key", message: "서버에 GOOGLE_TTS_KEY가 설정되지 않았습니다." }, 500);

    let body; try { body = await request.json(); } catch (e) { body = {}; }

    // 학교 입장 코드 검사 (ACCESS_CODE 환경변수가 설정된 경우에만 적용)
    const accessCode = env.ACCESS_CODE;
    if (accessCode && (!body || body.code !== accessCode)) {
      return json({ error: "bad_code", message: "학교 입장 코드가 올바르지 않습니다." }, 403);
    }

    const text = (body && typeof body.text === "string") ? body.text.slice(0, 1200) : "";
    if (!text.trim()) return json({ error: "no_text", message: "text가 비어 있습니다." }, 400);
    const gender = (body && body.gender === "m") ? "m" : "f";
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(key)}`;

    // Chirp3-HD 음성으로 먼저 시도 → 실패하면 Neural2로 자동 대체
    async function synth(voiceName) {
      // 참고: Chirp3-HD 음성은 pitch를 지원하지 않으므로 넣지 않습니다.
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: "ko-KR", name: voiceName },
          audioConfig: { audioEncoding: "MP3", speakingRate: SPEAKING_RATE },
        }),
      });
      return res;
    }

    let upstream = await synth(VOICES[gender]);
    if (!upstream.ok) {
      // Chirp3 실패 → 예비 음성(Neural2)으로 재시도
      upstream = await synth(FALLBACK_VOICES[gender]);
    }
    if (!upstream.ok) {
      const detail = (await upstream.text()).slice(0, 500);
      return json({ error: "tts_upstream_error", status: upstream.status, message: detail }, 502);
    }
    const data = await upstream.json();
    if (!data.audioContent) return json({ error: "tts_empty", message: "음성 데이터를 받지 못했습니다." }, 502);
    return json({ audio: data.audioContent }); // base64 MP3
  } catch (e) {
    return json({ error: "server_error", message: String((e && e.message) || e).slice(0, 300) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: JSON_HEADERS });
}
