-- ============================================================
-- queries_B.sql — SQL 담당 2: 시계열 / 기간별 변화
-- 담당: (이름)   브랜치: <본인 github id>
-- 결과 내보내기: outputs/sql_B_daily_total.csv, outputs/sql_B_max_change.csv
-- 컬럼명은 실제 CSV를 확인한 뒤 수정한다.
-- 포트폴리오는 포지션 단위 → 종목별 SUM(quantity) 로 집계한 서브쿼리를 JOIN 한다.
-- ============================================================
-- 주의: SQLite/Oracle 모두 정수÷정수는 정수가 될 수 있다. 비율 계산은 반드시 `* 100.0 /` 처럼 실수로 만든다.
-- 주의: ticker 는 문자열(TEXT). '005930' 의 앞 0 이 사라지면 JOIN 이 깨진다.

-- [B-0] 기간 확인: 최소/최대 일자, 일자 수, 종목별 일자 수 불일치 여부
SELECT MIN(trade_date), MAX(trade_date), COUNT(DISTINCT trade_date) FROM stock_prices;
SELECT ticker, COUNT(*) AS n_days FROM stock_prices GROUP BY ticker ORDER BY n_days;

-- [B-1] 일자별 포트폴리오 총 평가금액
SELECT
    sp.trade_date,
    ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
GROUP BY sp.trade_date
ORDER BY sp.trade_date;

-- [B-2] 전일 대비 변화량 / 변화율 (LAG 윈도우 함수)
-- @export: sql_B_daily_total.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
)
SELECT
    trade_date,
    total_eval,
    total_eval - LAG(total_eval) OVER (ORDER BY trade_date)                       AS diff_amt,
    ROUND((total_eval - LAG(total_eval) OVER (ORDER BY trade_date)) * 100.0 / LAG(total_eval) OVER (ORDER BY trade_date), 2)                  AS diff_pct
FROM daily
ORDER BY trade_date;

-- [B-3] 변화율이 가장 컸던 날 상위 5 (상승/하락 각각)
-- @export: sql_B_max_change.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
),
chg AS (
    SELECT trade_date, total_eval,
           ROUND((total_eval - LAG(total_eval) OVER (ORDER BY trade_date)) * 100.0 / LAG(total_eval) OVER (ORDER BY trade_date), 2) AS diff_pct
    FROM daily
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY diff_pct DESC) AS rn_up,
              ROW_NUMBER() OVER (ORDER BY diff_pct ASC)  AS rn_down
    FROM chg WHERE diff_pct IS NOT NULL
)
SELECT trade_date, total_eval, diff_pct,
       CASE WHEN rn_up <= 5 THEN 'up' ELSE 'down' END AS direction
FROM ranked
WHERE rn_up <= 5 OR rn_down <= 5
ORDER BY diff_pct DESC;

-- [B-4] 주별 집계 (SQLite: strftime('%Y-%W') / Oracle: TO_CHAR(trade_date,'IYYY-IW'))
-- @export: sql_B_weekly.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
),
wk AS (
    SELECT strftime('%Y-%W', trade_date) AS week, trade_date, total_eval,
           FIRST_VALUE(total_eval) OVER (PARTITION BY strftime('%Y-%W', trade_date) ORDER BY trade_date) AS week_first,
           FIRST_VALUE(total_eval) OVER (PARTITION BY strftime('%Y-%W', trade_date) ORDER BY trade_date DESC) AS week_last
    FROM daily
)
SELECT week, MIN(trade_date) AS start_date, MAX(trade_date) AS end_date,
       MIN(week_first) AS first_eval, MIN(week_last) AS last_eval,
       MIN(total_eval) AS min_eval, MAX(total_eval) AS max_eval,
       ROUND((MIN(week_last) - MIN(week_first)) * 100.0 / MIN(week_first), 2) AS change_pct
FROM wk
GROUP BY week
ORDER BY week;

-- [B-5] 기간 전체 최대/최소 총액과 그 일자
-- @export: sql_B_min_max.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
)
SELECT 'max' AS kind, trade_date, total_eval FROM daily WHERE total_eval = (SELECT MAX(total_eval) FROM daily)
UNION ALL
SELECT 'min', trade_date, total_eval FROM daily WHERE total_eval = (SELECT MIN(total_eval) FROM daily);

-- ============================================================
-- [C] 시장지수 비교 (market_index 테이블, index_name 은 실제 값으로 교체: '코스피' 또는 'SYNTH_KOSPI')
-- ============================================================

-- [B-6] 포트폴리오 vs 지수 일간 변화율, 초과수익률
-- @export: sql_B_vs_index.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
),
idx AS (
    SELECT trade_date, close_value
    FROM market_index
    WHERE index_name = (SELECT MIN(index_name) FROM market_index)   -- 첫 번째 지수 사용
),
j AS (
    SELECT d.trade_date, d.total_eval, i.close_value
    FROM daily d JOIN idx i ON d.trade_date = i.trade_date
)
SELECT trade_date, total_eval, close_value,
       ROUND((total_eval - LAG(total_eval) OVER (ORDER BY trade_date)) * 100.0 / LAG(total_eval) OVER (ORDER BY trade_date), 2) AS port_pct,
       ROUND((close_value - LAG(close_value) OVER (ORDER BY trade_date)) * 100.0 / LAG(close_value) OVER (ORDER BY trade_date), 2) AS index_pct,
       ROUND((total_eval - LAG(total_eval) OVER (ORDER BY trade_date)) * 100.0 / LAG(total_eval) OVER (ORDER BY trade_date)
           - (close_value - LAG(close_value) OVER (ORDER BY trade_date)) * 100.0 / LAG(close_value) OVER (ORDER BY trade_date), 2) AS excess_pct
FROM j
ORDER BY trade_date;

-- [B-7] 지수 변동 상위 5일에 포트폴리오는 어떻게 움직였나
-- @export: sql_B_index_shock_days.csv
WITH daily AS (
    SELECT sp.trade_date, ROUND(SUM(pf.quantity * sp.close_price), 2) AS total_eval
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
    GROUP BY sp.trade_date
),
idx AS (
    SELECT trade_date, close_value FROM market_index
    WHERE index_name = (SELECT MIN(index_name) FROM market_index)
),
chg AS (
    SELECT d.trade_date,
           ROUND((d.total_eval - LAG(d.total_eval) OVER (ORDER BY d.trade_date)) * 100.0 / LAG(d.total_eval) OVER (ORDER BY d.trade_date), 2) AS port_pct,
           ROUND((i.close_value - LAG(i.close_value) OVER (ORDER BY d.trade_date)) * 100.0 / LAG(i.close_value) OVER (ORDER BY d.trade_date), 2) AS index_pct
    FROM daily d JOIN idx i ON d.trade_date = i.trade_date
)
SELECT trade_date, index_pct, port_pct,
       CASE WHEN (index_pct > 0) = (port_pct > 0) THEN 'same' ELSE 'opposite' END AS direction
FROM chg
WHERE index_pct IS NOT NULL
ORDER BY ABS(index_pct) DESC
LIMIT 5;

-- [B-8] 지수 급변일의 종목별 기여도 (어느 종목이 차이를 만들었나)
-- @export: sql_B_contribution.csv
WITH idx AS (
    SELECT trade_date, close_value FROM market_index
    WHERE index_name = (SELECT MIN(index_name) FROM market_index)
),
idx_chg AS (
    SELECT trade_date,
           (close_value - LAG(close_value) OVER (ORDER BY trade_date)) * 100.0 / LAG(close_value) OVER (ORDER BY trade_date) AS index_pct
    FROM idx
),
shock AS (
    SELECT trade_date FROM idx_chg WHERE index_pct IS NOT NULL ORDER BY ABS(index_pct) DESC LIMIT 5
),
stock_chg AS (
    SELECT sp.trade_date, sp.ticker, pf.quantity,
           sp.close_price - LAG(sp.close_price) OVER (PARTITION BY sp.ticker ORDER BY sp.trade_date) AS price_diff
    FROM stock_prices sp JOIN (SELECT ticker, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker) pf ON sp.ticker = pf.ticker
)
SELECT s.trade_date, s.ticker,
       ROUND(s.quantity * s.price_diff, 2) AS pnl_contribution
FROM stock_chg s JOIN shock k ON s.trade_date = k.trade_date
ORDER BY s.trade_date, pnl_contribution DESC;
