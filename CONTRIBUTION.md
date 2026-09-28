# CONTRIBUTION.md — 팀원별 기여 기록

> 각자 **본인 섹션만** 편집한다. 마지막에 통합 담당이 Insights와 대조한다.

## 공통 기준 (문서에서 요구하는 최소 개인 기여)

- 의미 있는 Commit 2회 이상
- 본인 SQL 또는 Pandas 코드가 최종 결과물에 실제 포함
- 본인 작업을 60초 안에 설명 가능
- 다른 팀원 PR에 리뷰 1회 이상

---

## 1. (이름) — 팀 리드 / 공통 설계

- 브랜치: `<본인 github id>`
- 작업 파일: `docs/requirements.md`, `docs/api.md`, `README.md`, `CONTRIBUTION.md`, `result_report.md` 취합, Issue·PR 관리
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 2. (이름) — F 데이터

- 브랜치: `<본인 github id>`
- 작업 파일: `backend/utils/columns.py`, `backend/utils/load_to_sqlite.py`, `data/processed/*.csv` + 전처리 스크립트, 원본 품질 체크(결측·중복·이상값)
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 3. (이름) — F 분석/SQL

- 브랜치: `<본인 github id>`
- 작업 파일: `sql/portfolio.sql` → `outputs/sql_A_*.csv`, `backend/services/portfolio/calculator.py`·`sql_compare.py`, `notebooks/portfolio_analysis.ipynb` → `outputs/pandas_C_*.csv`
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 4. (이름) — C 데이터 수집

- 브랜치: `<본인 github id>`
- 작업 파일: `backend/services/market/collector.py`, `data/market/index.csv`(·gold·carbon), 거래일 정합 확인
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 5. (이름) — C 분석

- 브랜치: `<본인 github id>`
- 작업 파일: `sql/market.sql` → `outputs/sql_B_*.csv`, `backend/services/market/analyzer.py`·`indicators.py`, `notebooks/market_analysis.ipynb`·`index_analysis.ipynb` → `outputs/pandas_D_*`, `pandas_E_*`
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 6. (이름) — AI 브리핑

- 브랜치: `<본인 github id>`
- 작업 파일: `backend/services/ai/briefing.py`, `ai_log.md`(팀 사례 취합·검증), `result_report.md` §6 브리핑
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:

## 7. (이름) — 서비스/UI + 통합/테스트

- 브랜치: `<본인 github id>`
- 작업 파일: `frontend/app.py`, `backend/main.py`·`backend/api/*`, `tests/` 실행(단위 + `integration/test_sql_vs_pandas.py`) → `outputs/validation_report.md`
- 주요 커밋:
  - `[이름] type: ...` (#해시)
  - `[이름] type: ...` (#해시)
- PR: #번호
- 리뷰한 PR: #번호 (남긴 의견 요약)
- 60초 설명:
