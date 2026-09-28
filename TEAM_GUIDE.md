# TEAM_GUIDE — 팀원용 5분 안내

커밋 규칙 원문은 `COMMIT_RULES.md`. 여기는 이 프로젝트에 맞춘 실행 순서.

## 시작 (각자)
```bash
git clone <repo-url> && cd kb-project
git checkout -b <본인 github id>        # 예: git checkout -b joonhwanko
git push -u origin <본인 github id>
pip install -r requirements.txt
```
data/ 폴더의 portfolio.csv, stock_prices.csv 는 통합 담당이 main에 올려둔다.
4번(C 데이터 수집)은 `python -m backend.services.market.collector` 로 data/market/index.csv 를 만들어 **00:40 전에** PR로 main에 올린다. API가 안 되면 자동으로 가상 지수가 생성되니 그걸로 먼저 올리고, 나중에 API가 되면 교체한다.

## 작업 중
- **작업 시작 전마다** `git pull origin main` (남이 올린 data/·outputs/ 받기)
- 내 파일만 수정한다. README/CONTRIBUTION/ai_log는 내 섹션만. `docs/api.md`의 결과 파일 계약(컬럼명)을 바꾸려면 리드에게 먼저.
- 계산 로직은 `backend/services/`에 함수로 쓰고, 노트북은 그 함수를 import해서 결과를 보여준다 (API·브리핑이 같은 함수를 씀).
- 컬럼명이 다르면 `ticker / trade_date / close_price / quantity / buy_price` (지수: `trade_date / index_name / close_value`) 기준으로 코드 쪽을 고친다.
- 결과는 `outputs/<접두어>_<내용>.csv` 로 내보낸다. 7번(테스트)은 이 파일만 본다.
- 전처리한 데이터는 `data/processed/<내용>_<이름>.csv` 에 넣고 **전처리 스크립트를 반드시 같이 커밋**한다. `data/raw/` 원본은 수정 금지.
- 노트북은 커밋 전에 Kernel → Restart & Clear Output.

## 커밋 (의미 있는 단위로 최소 2회, 02:30 전 1회 이상)
```bash
git add <내 파일>
git commit -m "[이름] type: 작업 내용"
git push origin <본인 github id>
```
| type | 쓰는 때 | 이 프로젝트 예시 |
|---|---|---|
| `data` | 데이터 수집·전처리 | `[고준환] data: market_index.csv 생성 (가상 지수)` |
| `feat` | 새 분석·쿼리 | `[고준환] feat: 종목별 평가금액·손익률 SQL 추가` |
| `test` | 결과 검증 | `[고준환] test: SQL vs Pandas 평가금액 교차검증` |
| `fix` | 오류 수정 | `[고준환] fix: 거래일 불일치로 인한 JOIN 누락 수정` |
| `docs` | 문서 | `[고준환] docs: result_report 질문 2 결과 작성` |
| `refactor` / `chore` | 구조 개선 / 환경 | `[고준환] chore: requirements에 requests 추가` |

❌ `[고준환] 수정`, `최종`, `test` — 작업 내용이 안 보이는 메시지는 기여로 안 친다.

## PR (02:30–03:00)
GitHub에서 `<본인 브랜치> → main` PR 생성. 템플릿 4칸 채우고 `Closes #N` 적기.
리뷰 짝: 2↔3, 4↔5, 6↔7. 짝의 PR에 코멘트 1개 이상 남기고 Approve. 리드(1)가 머지.

## 금지
- `main`에 직접 push, `git push --force`
- 남의 노트북/SQL 파일 수정
- 통합 담당이 남의 코드를 대신 커밋 (기여가 사라짐)

## 시간표
| 시각 | 할 일 |
|---|---|
| 00:00–00:20 | 저장소·Issue·개인 브랜치 세팅, data/ 원본 CSV main 커밋 |
| 00:20–02:30 | 각자 작업, `git pull origin main` 후 중간 커밋 |
| 02:30–03:00 | PR 올리기, 짝 리뷰 |
| 03:00–03:25 | main 머지, 7번이 `python tests/integration/test_sql_vs_pandas.py` 최종 실행 → `test:` 커밋 |
| 03:25–03:45 | README 핵심결과·CONTRIBUTION·result_report 채우기 (`docs:`) |
| 03:45 | `git tag v1.0 && git push origin v1.0` 후 제출 |
