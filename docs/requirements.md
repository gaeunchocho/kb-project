# 요구사항 정의서 — 금융 데이터랩 (F 포트폴리오 + C 시장 지표)

작성: 리드 · 버전 1.0 · 4시간 원데이 프로젝트 기준

## 1. 목적

사용자의 가상 보유종목을 평가하고(F), 같은 기간 시장 지표(주가지수·금·배출권)와 비교해 변동이 큰 구간을 찾아 AI 브리핑 문장으로 전달한다(C). SQL과 Pandas로 같은 값을 각각 계산해 교차검증하는 것이 정확성의 근거다.

```
사용자
  └── 금융 데이터랩
        ├── F. 포트폴리오 데이터랩 — 평가금액 · 손익 · SQL↔Pandas 교차검증
        └── C. 시장 지표 브리핑   — 지수/금/배출권 · 변동구간 탐색 · AI 브리핑
```

## 2. 범위

| 구분 | 필수 (채점 대상) | 선택 (시간 남을 때) |
|---|---|---|
| 데이터 | 강사 제공 원본(`data/raw/`) + 2번 전처리(`data/processed/`): `06_portfolio.csv`(300포지션), `06_stock_prices.csv`(30종목×252일), 생성 지수 `market/index.csv` | 금융위 API 실제 지수, market/gold.csv, carbon.csv |
| 분석 | F 평가·손익·비중, C 지수 변동구간, F×C 초과수익·기여도 | 금·배출권 상관, 5일 이동변화 |
| 검증 | SQL↔Pandas 3쌍 교차검증, 거래일 정합 | 단위 테스트 커버리지 |
| 출력 | notebooks, outputs/*.csv, result_report.md | backend API, frontend 화면(7), n8n 전달 |
| AI | ai_log.md 사례 ≥2, briefing.py 문장 생성 | LLM 요약 연동 |

**우선순위 원칙**: 필수 열이 03:00까지 완성되지 않으면 선택 열 작업은 중단하고 필수로 합류한다.

## 3. 기능 요구사항

담당 번호: 1 리드 · 2 F데이터 · 3 F분석/SQL · 4 C수집 · 5 C분석 · 6 AI브리핑 · 7 서비스/UI+테스트

### F. 포트폴리오 데이터랩
| ID | 요구사항 | 입력 | 출력 | 담당 |
|---|---|---|---|---|
| F-1 | 포지션을 종목별로 SUM한 뒤 최신 종가 기준 평가금액·매입금액·손익·손익률 계산 (가중평균 매입가) | portfolio, stock_prices | `outputs/sql_A_valuation.csv`, `pandas_C_valuation.csv` | 3 |
| F-2 | 손익률 상위/하위 3종목 | F-1 | `*_top_bottom.csv` | 〃 |
| F-3 | 종목 비중(%) | F-1 | `sql_A_weight.csv` | 〃 |
| F-4 | 일자별 포트폴리오 총액과 전일 대비 변화율 | portfolio, stock_prices | `sql_B_daily_total.csv`, `pandas_D_daily_total.csv` | 5 |
| F-5 | SQL 결과와 Pandas 결과의 값 일치 검증 (허용오차 0.01) | outputs/ | `outputs/validation_report.md` | 7 (계산 비교 로직은 3) |

### C. 시장 지표 브리핑
| ID | 요구사항 | 입력 | 출력 | 담당 |
|---|---|---|---|---|
| C-1 | 지수 시세 수집 (API → CSV, 실패 시 가상 지수 자동 생성) | 금융위 API 또는 stock_prices | `data/market/index.csv` | 4 |
| C-2 | 지표별 평균·최대·최소·변동성, 일간 변화 상위 5 | market/* | `pandas_E_index_summary.csv` | 4 |
| C-3 | 포트폴리오 vs 지수 일간 변화율·초과수익률 | F-4, C-1 | `sql_B_vs_index.csv`, `pandas_D_vs_index.csv` | 5 |
| C-4 | 지수 급변일(상위 5)의 포트폴리오 방향과 종목별 기여도 | C-3 | `sql_B_index_shock_days.csv`, `sql_B_contribution.csv` | 5 |
| C-5 | 위 결과를 근거 수치와 함께 한국어 브리핑 문장으로 생성 | outputs/ | `result_report.md` §6, `briefing.py` | 6 |
| C-6 | (선택) 금·배출권 시세 수집 및 지수와 비교 | 금융위 일반상품시세 API | `data/market/gold.csv`, `carbon.csv` | 4 |

### 공통
| ID | 요구사항 |
|---|---|
| G-1 | 모든 수치는 `outputs/` CSV 파일명과 함께 리포트에 기재한다. 근거 파일 없는 주장은 삭제한다. |
| G-2 | AI가 생성한 코드는 실행·검증 후 채택/수정/폐기를 `ai_log.md`에 남긴다. |
| G-3 | 컬럼명 표준: `ticker, trade_date, close_price, quantity, buy_price` / 지표: `trade_date, index_name, close_value` |

## 4. 비기능 요구사항

- 재현성: `pip install -r requirements.txt` 후 README의 명령 5개로 전 결과가 재생성되어야 한다.
- 외부 의존 최소화: sqlite3 CLI, Oracle 접속 없이 Python만으로 SQL 실행 가능(`backend/utils/run_sql.py`).
- 데이터 불변: `data/` 원본은 수정하지 않는다. 전처리 결과는 `outputs/`에.
- 노트북은 1인 1파일, 커밋 전 output clear.

## 5. 분석 질문 (발표용 3개)

1. 종목별 평가금액·손익률은 얼마이며, 상위/하위 3개는? (F-1, F-2)
2. 포트폴리오와 시장지수의 일간 변화율을 비교했을 때 초과수익이 가장 컸던/부진했던 구간은? (C-3)
3. 지수 급변일에 포트폴리오는 같은 방향으로 움직였는가, 어느 종목이 차이를 만들었는가? (C-4)

## 6. 일정과 체크포인트

| 시각 | 마일스톤 | 리드 확인 항목 |
|---|---|---|
| 00:20 | Issue 7개·개인 브랜치·data/ 원본 커밋 | 전원 브랜치 push 확인 |
| 00:40 | `data/market/index.csv` main 반영 | 거래일 정합 통과 |
| 02:30 | 전원 중간 커밋 ≥1, 첫 PR | Insights 기여 편중 확인 |
| 03:00 | main 머지, 교차검증 PASS | `test_sql_vs_pandas.py` exit 0 |
| 03:25 | result_report 3개 질문 채움 | 근거 파일명 누락 없는지 |
| 03:45 | `v1.0` 태그 | README 핵심 결과 3줄 |

## 7. 리스크와 대응

| 리스크 | 대응 |
|---|---|
| 포트폴리오가 포지션 단위 | 시세 JOIN 전 종목별 SUM 서브쿼리 필수 (docs/api.md §1). 검증 스크립트가 키 중복을 잡아냄 |
| 금융위 API 키 발급 지연 | 선택 항목. 미발급이면 synthetic 지수 그대로 진행 |
| 지수·시세 거래일 불일치 | INNER JOIN 기준 통일, 검증 스크립트가 차집합을 출력 |
| 노트북 충돌 | 1인 1파일 + `.gitattributes` merge=ours |
| backend/frontend에 시간 소진 | 03:00 필수 열 미완이면 선택 작업 중단 (§2 원칙) |
| 기여 편중 | 리드는 남의 코드를 대신 커밋하지 않는다. 02:30 Insights 점검 |
