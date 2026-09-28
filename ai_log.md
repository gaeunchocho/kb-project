# ai_log.md — AI 활용 및 검증 기록

> 팀 전체 최소 2개, 권장은 1인 1사례. **본인 사례는 본인 브랜치에서 본인이 직접 커밋**한다 (`[이름] docs: ai_log 사례 N 추가`). 6번(AI 브리핑)이 취합·형식 통일. 각 사례마다 **채택 / 수정 / 폐기** 중 하나와 이유를 반드시 적는다.
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

### 사례 3 — 리드 (도구: Claude)
- 요청 내용: `outputs/*.csv`를 읽어 JSON으로 반환하는 FastAPI 라우터(`/portfolio/valuation`, `/market/vs-index` 등 9개) 생성
- AI 응답 요약: `pd.read_csv(...).to_dict(orient="records")`로 바로 반환하는 코드. `df.where(df.notna(), None)`으로 결측을 null 처리했다고 설명
- 실행·검증 결과: TestClient로 9개 엔드포인트 호출 → `/market/vs-index`에서 500 에러 `ValueError: Out of range float values are not JSON compliant`. 첫 거래일의 `port_pct`(pct_change 결과)가 NaN인데, float 컬럼에서는 `where(..., None)`이 None 대신 NaN을 유지해 JSON 직렬화 실패
- 판정: 수정
- 이유: AI 설명("null 처리됨")이 실제 동작과 달랐음. 실행 없이 넘겼으면 화면 담당(7번)이 API 연동 시 원인 모를 500을 만났을 것
- 최종 반영 위치: `backend/api/_common.py` `records()` — `df.astype(object).where(df.notna(), None)` 로 변경. 9/9 엔드포인트 200 확인

### 사례 4 — 리드 (도구: Claude)
- 요청 내용: 강사 CSV가 도착하기 전, 파이프라인을 미리 검증하려고 가상 포트폴리오·시세·지수 생성 스크립트(`make_synthetic.py`) 작성 요청
- AI 응답 요약: 실제 종목코드(005930 등)를 빌린 8종목 × 120거래일 기하 브라운 운동 시세, 첫날=1000 정규화 지수, 금·배출권 시계열까지 생성하는 스크립트
- 실행·검증 결과: 두 가지 문제 ① `pd.bdate_range(end="2026-09-26", periods=120)`에서 종료일이 토요일이라 119개만 생성 → 배열 길이 불일치 오류 ② 가격을 정수로 만들자 SQLite에서 `(close - buy) / buy`가 정수 나눗셈으로 0이 되어 손익률 전부 0.0. 티커 `005930`도 pandas가 숫자 5930으로 읽어 SQL(문자열)과 키 불일치
- 판정: 폐기 (스크립트 자체는 삭제). 단, 여기서 발견한 두 함정은 규칙으로 채택
- 이유: 강사 CSV가 도착해 가상 데이터가 불필요해짐. 그러나 정수 나눗셈·티커 문자열 문제는 실데이터에서도 재발 가능해 SQL 파일 상단 주의사항과 `columns.py`의 `dtype={"ticker": str}`로 남김
- 최종 반영 위치: `sql/portfolio.sql`, `sql/market.sql` 상단 주석 및 모든 비율 계산 `* 100.0 /`; `backend/utils/columns.py`

### 사례 5 — 인애 (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

### 사례 6 — 3번 F 분석/SQL (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

### 사례 7 — 5번 C 분석 (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

### 사례 8 — 6번 AI 브리핑 (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

### 사례 9 — 7번 서비스/UI·테스트 (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

---

## 제거한 AI 주장 목록

> AI가 설명에 넣었지만 데이터로 확인할 수 없어서 뺀 문장들.

- "지수 변동이 컸던 상위 5일 중 100%는 포트폴리오가 같은 방향으로 움직였습니다" (briefing.py 초기 출력) → 당시 지수가 보유 30종목 평균으로 만든 SYNTH_KOSPI라 포트폴리오와 같은 데이터에서 나온 값. 동어반복이라 근거로 쓸 수 없어 제거. 민지가 실제 코스피로 교체한 뒤 재계산하니 60%로 바뀜 → 이 수치만 사용
- "종목코드·종목명은 실제 상장사" (README 초안, 가상 데이터 시절) → 강사 CSV(S06_001~030, SYNTH_STOCK_xx)로 교체되면서 삭제
- "IQR 이상값 후보 80건은 데이터 오류" (품질 리포트 해석 초안) → 종목별 가격대가 2만~11만 원으로 달라 전체 IQR로 잡힌 것. 종목별로 보면 이상 없음. '오류'라는 표현 삭제, '가격대 차이'로 기재
- 브리핑 문장 중 "시장 대비 방어적/공격적" 류의 성격 규정 → 베타·상관계수를 계산하지 않았으므로 근거 없음. 변화율 수치만 남기고 형용사 삭제
