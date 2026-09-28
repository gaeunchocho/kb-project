# frontend (선택)

- 4시간 안에는 `app.py`(Streamlit) 하나로 화면을 만든다. `pages/`, `components/`, `services/`는 시간이 남을 때 React 등으로 확장하는 자리.
- React 화면은 백엔드 API를 호출하지 않고 `frontend/public/outputs/`의 정적 CSV만 읽는다.
- `npm start`와 `npm run build` 전에 `scripts/sync-outputs.js`가 루트 `outputs/*.csv`를 복사한다. 일별 총액 및 지수 비교 결과가 없으면 기존 `data/raw/` 포트폴리오·주가 CSV와 `data/market/index.csv`에서 프론트 정적 결과를 준비한다.
- 결과 CSV를 갱신한 뒤에는 프론트엔드를 다시 시작하거나 새로 빌드한다. 원본 CSV가 없는 결과는 대체 데이터를 만들지 않고 화면에 파일 없음으로 표시한다.
