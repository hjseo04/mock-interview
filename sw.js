// 양주백석고 AI 모의면접 — 서비스워커
// 목적: 안드로이드가 '진짜 앱(PWA)'으로 인식하도록 fetch 핸들러를 제공합니다.
// 전략: 항상 네트워크 우선(network-first) → 재배포한 최신 내용이 바로 반영됩니다.
//       (오래된 화면이 캐시에 묶이는 문제 없음)
// 주의: /api/ 요청과 GET 이외 요청은 절대 건드리지 않습니다(AI·음성 호출 보호).

const CACHE = "ajb-shell-v1";

self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                 // POST(API 호출) 등은 그대로 통과
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;   // 외부 요청은 건드리지 않음
  if (url.pathname.startsWith("/api/")) return;       // AI·음성 API는 캐시하지 않음

  // 네트워크 우선: 항상 최신을 받아오고, 사본을 캐시에 저장.
  // 오프라인일 때만 캐시로 대체(앱 아이콘/오프라인 안내용).
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
