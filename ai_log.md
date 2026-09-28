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

### 사례 2 — 이채우 (도구: ChatGPT)
- 요청 내용: F 분석/SQL 담당자가 수행할 작업을 초보자 기준으로 설명하고, CSV 적재부터 SQL 실행, Pandas 분석, SQL·Pandas 교차검증까지의 실행 순서와 Git 작업 방법 안내 요청
- AI 응답 요약: `load_to_sqlite.py`로 원본 CSV를 SQLite에 적재한 뒤 `portfolio.sql`을 실행하고, `portfolio_analysis.ipynb`에서 Pandas 계산 결과를 생성한 후 `test_sql_vs_pandas.py`로 결과를 비교하는 절차를 안내함. 평가금액은 `수량 × 최신 종가`, 손익은 `평가금액 - 매입금액`, 손익률은 `손익 ÷ 매입금액 × 100`으로 확인하도록 설명함
- 실행·검증 결과: `portfolio` 300행과 `stock_prices` 7,560행이 정상 적재됐고, SQL 결과 CSV 5개와 Pandas 결과 CSV 3개가 생성됨. 교차검증 결과 `eval_amount`와 `pnl_pct`의 최대 차이가 모두 0.000000으로 확인됐으며 최종 결과는 PASS였음. 시장지표 관련 파일은 다른 담당자의 작업 전이라 SKIP됨
- 판정: 채택
- 이유: 안내받은 명령과 검증 절차를 실제로 실행했고, SQL과 Pandas 결과가 완전히 일치하는 것을 확인했음. AI의 설명만으로 판단하지 않고 통합 테스트의 수치와 PASS 결과로 검증함
- 최종 반영 위치: `sql/portfolio.sql`, `notebooks/portfolio_analysis.ipynb`, `outputs/sql_A_*.csv`, `outputs/pandas_C_*.csv`

### 사례 3 — (담당자) (도구: )
- 요청 내용:
- AI 응답 요약:
- 실행·검증 결과:
- 판정:
- 이유:
- 최종 반영 위치:

---

## 제거한 AI 주장 목록

> AI가 설명에 넣었지만 데이터로 확인할 수 없어서 뺀 문장들.

- (예) "이 종목은 시장 대비 방어적이다" → stock_prices.csv에 시장지수가 없어 확인 불가, 삭제
