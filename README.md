# 양주백석고 AI 모의면접 — 자체 서버 버전 배포 가이드

이 폴더를 인터넷에 올리면, **학생들이 로그인·요금제 없이** 링크(또는 홈 화면 앱)로 바로 모의면접을 할 수 있습니다.
AI 사용료는 **학교 API 키 1개**로만 발생하고, 키는 학생에게 절대 노출되지 않습니다.

```
ajb-mock-interview/
├─ index.html              ← 학생이 보는 앱 (대학 데이터·교표·PDF 분석 전부 포함)
├─ functions/
│  └─ api/
│     └─ ask.js            ← 백엔드: 학교 키로 AI(Gemini) 호출 (키를 숨김)
└─ README.md               ← 이 안내서
```

> 전체를 **브라우저만으로** 배포합니다. 프로그램 설치·명령어 입력 없이 진행할 수 있습니다.

---

## 1단계 — 구글 Gemini API 키 발급 (무료 등급 가능)

1. 크롬에서 **[Google AI Studio](https://aistudio.google.com/apikey)** 접속 → 선생님 **goedu.kr(구글) 계정**으로 로그인
2. **`API 키 만들기(Create API key)`** 클릭 → 만들어진 키(예: `AIza...`)를 **복사**해서 메모장에 잠시 보관
3. (지금은 선생님 개인 계정으로 테스트하고, 나중에 4단계에서 **학교 키로 교체**하면 됩니다.)

> 💡 처음엔 무료 등급으로 충분히 테스트됩니다. 학급 전체 공개 시 사용량이 늘면 결제(종량제)를 켜세요 — Gemini Flash는 매우 저렴합니다(모의면접 1회에 대략 몇 원~수십 원 수준).

---

## 2단계 — 파일을 GitHub에 올리기 (무료)

1. **[github.com](https://github.com)** 가입/로그인 (학교 공용 계정 권장)
2. 우측 상단 **`+` → New repository** → 이름 예: `mock-interview` → **Public** 또는 Private → **Create repository**
3. 새 저장소 화면에서 **`uploading an existing file`** 링크 클릭
4. 이 폴더 안의 **`index.html`, `functions` 폴더, `README.md`** 를 **통째로 끌어다 놓기**
   - `functions/api/ask.js` 의 폴더 구조가 그대로 유지되도록 폴더째 올리세요.
5. **`Commit changes`** 클릭

---

## 3단계 — Cloudflare Pages로 배포 (무료)

1. **[dash.cloudflare.com](https://dash.cloudflare.com)** 가입/로그인
2. 왼쪽 메뉴 **`Workers & Pages` → `Create` → `Pages` 탭 → `Connect to Git`**
3. 방금 만든 GitHub 저장소(`mock-interview`) 선택 → **`Begin setup`**
4. 빌드 설정은 **비워 두거나 기본값** 그대로:
   - Framework preset: **None**
   - Build command: **(비움)**
   - Build output directory: **`/`** (기본값)
5. **`Save and Deploy`** → 잠시 후 `https://mock-interview-xxxx.pages.dev` 같은 **주소가 생성**됩니다.

---

## 4단계 — API 키를 서버에 등록 (가장 중요)

배포 후, 키를 서버에 넣어야 AI가 작동합니다.

1. Cloudflare의 그 Pages 프로젝트 → **`Settings` → `Environment variables`**
2. **`Add`** → 이름은 정확히 **`GEMINI_API_KEY`**, 값에는 **1단계에서 복사한 키**를 붙여넣기 → 저장
3. **`Deployments` → 최신 배포 → `Retry deployment`(재배포)** 로 키를 반영
4. 생성된 주소를 열어 모의면접을 한 번 돌려보세요. 질문이 나오면 성공입니다. 🎉

> ⚠️ **키는 절대 `index.html`이나 GitHub에 넣지 마세요.** 반드시 위처럼 **환경 변수**에만 저장해야 학생에게 노출되지 않습니다.

---

## 5단계 — 학생에게 공유

- 생성된 주소(`https://....pages.dev`)를 **클래스룸/밴드/카톡/QR코드**로 배포하세요.
- 학생은 **로그인 없이** 링크만 열면 바로 사용합니다.
- 폰에서는 브라우저 메뉴 → **“홈 화면에 추가”** 로 앱 아이콘처럼 쓸 수 있습니다.

---

## 나중에 — 학교 API 키로 교체 (전체 공개 시)

1. 1단계를 **학교 구글 계정 + 학교 결제수단**으로 다시 해서 **학교 키**를 발급
2. 4단계의 `GEMINI_API_KEY` 값만 **학교 키로 교체** → 재배포
3. 끝. 코드는 손댈 필요 없습니다.

---

## 자주 묻는 질문

- **비용은?** 호스팅(GitHub·Cloudflare)은 무료. **AI 사용료만** 학교 키로 발생(종량제). Gemini Flash는 저렴합니다.
- **학생 데이터는?** 면접 기록은 **각 학생 브라우저**에만 저장되고, 서버·교사에게 모이지 않습니다. 생기부 PDF도 기기에서만 분석되고 저장되지 않습니다.
- **“서버에 API 키가 설정되지 않았습니다” 오류가 떠요.** 4단계(환경 변수 등록 + 재배포)를 다시 확인하세요.
- **모델을 바꾸고 싶어요.** `functions/api/ask.js` 의 `MODEL` 값만 바꾸면 됩니다.

---

문의나 수정이 필요하면 이 앱을 만든 대화로 돌아와 요청하세요. (동영상 면접 기능은 다음 단계로 추가 예정)
