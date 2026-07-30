# Firebase 연동 설정 가이드

마스터 엑셀을 Firebase에 올려두면, **로그인만 하면 매번 파일을 고를 필요 없이** 과제·특허·연구원 등 현황이 자동으로 표시됩니다. 여러 기기·담당자가 같은 데이터를 공유할 수 있습니다.

> 협약서·특허증 원본은 Firebase에 올리지 않습니다. 계약금액·직인이 담긴 민감 문서라, 지금처럼 **각자 브라우저에서 폴더를 선택해 보기 전용**으로만 봅니다.

설정하기 전에는 기존 "파일 선택" 방식으로 그대로 동작하니, 급하지 않게 진행하셔도 됩니다.

---

## 1) Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → 구글 로그인
2. **프로젝트 만들기** → 이름(예: `sj-rlms`) 입력 → 생성 (애널리틱스는 꺼도 됨)

## 2) 웹 앱 등록 → 설정값 6개 확보

1. 프로젝트 개요 옆 **⚙ 프로젝트 설정** → 아래로 스크롤 → **내 앱** → **웹(</>)** 아이콘 클릭
2. 앱 닉네임(예: `rlms-web`) 입력 → 등록
3. 나오는 `firebaseConfig` 에서 6개 값을 복사:
   ```
   apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId
   ```

## 3) 로그인(Authentication) 켜기

1. 왼쪽 메뉴 **Authentication** → **시작하기**
2. **Sign-in method** → **이메일/비밀번호** → 사용 설정
3. **Users** 탭 → **사용자 추가** → 담당자 이메일·비밀번호 등록 (이 계정으로 로그인)

## 4) 저장소(Storage) 켜고 보안 규칙 적용

1. 왼쪽 메뉴 **Storage** → **시작하기** (기본값으로 진행)
2. **Rules** 탭 → 내용을 이 저장소의 [`storage.rules`](storage.rules) 파일 내용으로 교체 → **게시**
   - (로그인한 사용자만 마스터 엑셀 읽기/쓰기, 그 외 전면 차단)

## 5) 설정값을 서비스에 넣기

### Vercel(배포본)에 넣는 경우 — 권장
Vercel 프로젝트 → **Settings → Environment Variables** 에 6개 추가:

| 이름 | 값 |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | appId |

넣은 뒤 **Redeploy**.

### 로컬에서 테스트하는 경우
`sj-jhs2/.env.local` 파일을 만들어 [`.env.example`](.env.example) 형식으로 6개 값을 채우고 `npm run dev`.

## 6) 첫 사용

1. 배포 사이트 접속 → **로그인**(4번에서 만든 계정)
2. 처음엔 데이터가 없으니 **"엑셀 업로드"** 로 `신정개발_RLMS_마스터데이터.xlsx` 올리기 → Firebase에 저장됨
3. 이후에는 **로그인만 하면 자동으로** 최신 데이터가 표시됩니다
4. 데이터를 바꾸려면 엑셀을 수정하고 사이드바 **"엑셀 갱신"** 으로 다시 올리면 끝

---

## 보안 요약

- **로그인한 사용자만** 데이터를 봅니다(Firebase Auth). 계정은 관리자가 콘솔에서 발급.
- Storage 규칙으로 마스터 엑셀 외 경로는 전면 차단.
- 협약서·특허증은 Firebase에 올리지 않음 — 계속 로컬 폴더 선택 방식(가장 안전).
- 설정값(NEXT_PUBLIC_*)은 클라이언트 공개용이며, 실제 접근 제어는 로그인 + 보안 규칙이 담당합니다.
