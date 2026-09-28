# ai_log.md — AI 활용 및 검증 기록

> 팀 전체 최소 2개, 권장은 1인 1사례. **본인 사례는 본인이 직접 커밋**한다 (`[AI]` 접두어). 각 사례마다 **채택 / 수정 / 폐기** 중 하나와 이유를 반드시 적는다.
> AI가 만든 결과를 그대로 제출하지 않고, 실행해서 확인한 내용을 적는다.

## 기록 양식

```
### 사례 N — (담당자) (도구: ChatGPT / Claude / Copilot ...)
- 요청 내용: 무엇을 물어봤는가 (프롬프트 요약)
- AI 응답 요약: 어떤 코드/설명을 줬는가
- 실행·검증 결과: 실제로 돌려보니 어땠는가 (오류, 값 불일치 등)
- 판정: 채택 / 수정 / 폐기
- 이유: 왜 그렇게 판정했는가
- 최종 반영 위치: 파일명 + 함수/쿼리명
```

---

### 사례 1 — 리드 (도구: Claude)
- 요청 내용: 종목별 평가금액·손익률 SQL과 같은 계산의 Pandas 코드, 두 결과를 비교하는 검증 스크립트 생성
- AI 응답 요약: `portfolio JOIN stock_prices` 후 `quantity * close_price` 로 평가금액, `(close - buy) / buy * 100` 으로 손익률을 구하는 SQL과 동일 로직의 Pandas 코드. **포트폴리오는 종목당 1행**이라고 가정
- 실행·검증 결과: 강사 CSV를 넣자 검증 FAIL. 원인 ① 실제 portfolio.csv는 종목당 10개 포지션(총 300행)이라 그대로 JOIN하면 종목별 행이 10배로 중복되고 검증 키(ticker)가 겹침 ② 손익률을 '단가' 기준으로 계산하면 포지션마다 매입가가 달라 종목별 값이 정의되지 않음 ③ 원본 컬럼명이 `date/stock_id/price`, 파일 앞에 BOM
- 판정: 수정
- 이유: 로직은 맞지만 데이터 구조 가정이 틀렸음. 검증 스크립트가 없었으면 10배 부풀린 총액을 제출할 뻔함
- 최종 반영 위치: `sql/portfolio.sql` [A-1] `holdings` CTE(종목별 SUM, 가중평균 매입가), `sql/market.sql` 모든 JOIN을 집계 서브쿼리로; `calculator.py` `holdings()`; `backend/utils/columns.py` 컬럼 매핑 + utf-8-sig; 정수 나눗셈 방지용 `* 100.0 /` 를 SQL 상단 주의사항으로 기재

### 사례 2 — 민지 (도구: Claude Code)
- 요청 내용: 금융위원회 지수시세정보 API(GetMarketIndexInfoService_V2)로 코스피·코스닥 데이터를 수집하는 `collector.py`를 실제로 동작하게 고쳐달라고 요청
- AI 응답 요약: 처음엔 오퍼레이션명을 `getStockPriceInfo`로 추측해서 코드를 짰음 (문서 없이 관례적 이름으로 짐작)
- 실행·검증 결과: `getStockPriceInfo`로 실제 호출하니 `NO_OPENAPI_SERVICE_ERROR(12)`. 이후 채권/파생상품 오퍼레이션(`getBondMarketIndex_V2`, `getDerivationProductMarketIndex_V2`) 네이밍 패턴을 보고 `getStockMarketIndex_V2`로 재추정 → curl로 직접 호출해 `resultCode: 00`, 코스피·코스닥 각 235행 정상 수신 확인. 기존 `collector.py`에 있던 구버전 경로(`/service/GetMarketIndexInfoService/getStockMarketIndex`)는 이 서비스키로 승인된 적 없는 오퍼레이션이라 항상 대체(SYNTH_KOSPI) 경로로 빠지고 있었음
- 판정: 수정
- 이유: AI의 첫 추측(오퍼레이션명)은 틀렸고, 실제 curl 호출로 검증한 뒤에야 정확한 이름을 확정함. AI 코드를 그대로 커밋하지 않고 매번 실제 API 응답으로 확인한 덕에 틀린 엔드포인트를 걸러냄
- 최종 반영 위치: `backend/services/market/collector.py`의 `API_BASE`/`API_OPERATION` 상수, `fetch_index()`

### 사례 3 — 고준환 (도구: Copilot)
- 요청 내용: 백엔드 API와 기존 CSV를 활용해 포트폴리오·시장 지표 프론트엔드 구성
- AI 응답 요약: 응답 가능한 평가·상하위·지수 요약은 API로 호출하고, 없는 시계열 산출물은 기존 원본 CSV로 준비해 표시
- 실행·검증 결과: API 응답 및 정적 CSV 제공 확인, 프론트 테스트 4개와 빌드 통과; 누락 급변일 데이터에서도 화면 오류가 나지 않도록 검증
- 판정: 수정
- 이유: 데이터별 API 제공 여부에 맞춰 API와 CSV 방식을 분리하고 백엔드 및 `.env`는 변경하지 않음
- 최종 반영 위치: `frontend/src/api/client.js`, `frontend/src/pages/MarketPage.js`, `frontend/scripts/sync-outputs.js`

---

## 제거한 AI 주장 목록

> AI가 설명에 넣었지만 데이터로 확인할 수 없어서 뺀 문장들.

- (예) "이 종목은 시장 대비 방어적이다" → stock_prices.csv에 시장지수가 없어 확인 불가, 삭제
