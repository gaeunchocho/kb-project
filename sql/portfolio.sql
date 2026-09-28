-- ============================================================
-- portfolio.sql — SQL 담당 1: 보유/평가/손익 (F)
-- 담당: (이름)   브랜치: <본인 github id>
-- 담당: 이채우   브랜치: leechaewoo
-- 테이블: portfolio(position_id, ticker, name, buy_price, quantity) — 같은 종목이 여러 포지션으로 존재
--        stock_prices(trade_date, ticker, close_price, volume)
-- 주의: 비율 계산은 `* 100.0 /` 로 실수화. ticker 는 TEXT.
-- 결과 내보내기: 쿼리 위에 export 주석(@ + export: 파일명)을 붙이면 run_sql.py 가 outputs/ 로 저장
-- ============================================================

-- [A-0] 데이터 확인: 행 수, 종목 수, 포지션 수, 기간
SELECT COUNT(*) AS positions, COUNT(DISTINCT ticker) AS tickers FROM portfolio;
SELECT COUNT(*) AS n_rows, COUNT(DISTINCT ticker) AS tickers, MIN(trade_date), MAX(trade_date), COUNT(DISTINCT trade_date) AS days FROM stock_prices;
SELECT ticker, COUNT(*) AS positions, SUM(quantity) AS quantity FROM portfolio GROUP BY ticker ORDER BY positions DESC;

-- [A-1] 종목별 보유 집계 (포지션 SUM, 가중평균 매입가) + 최신 종가
-- @export: sql_A_holdings.csv
WITH latest AS (
    SELECT ticker, MAX(trade_date) AS last_date FROM stock_prices GROUP BY ticker
),
last_price AS (
    SELECT p.ticker, p.close_price
    FROM stock_prices p JOIN latest l ON p.ticker = l.ticker AND p.trade_date = l.last_date
),
holdings AS (
    SELECT ticker, MIN(name) AS name, COUNT(*) AS positions,
           SUM(quantity) AS quantity, SUM(quantity * buy_price) AS cost_amount
    FROM portfolio GROUP BY ticker
)
SELECT h.ticker, h.name, h.positions, h.quantity,
       ROUND(h.cost_amount * 1.0 / h.quantity, 2) AS buy_price, lp.close_price
FROM holdings h JOIN last_price lp ON h.ticker = lp.ticker
ORDER BY h.ticker;

-- [A-2] 종목별 평가금액 / 매입금액 / 손익 / 손익률 / 비중
-- @export: sql_A_valuation.csv
WITH latest AS (
    SELECT ticker, MAX(trade_date) AS last_date FROM stock_prices GROUP BY ticker
),
last_price AS (
    SELECT p.ticker, p.close_price
    FROM stock_prices p JOIN latest l ON p.ticker = l.ticker AND p.trade_date = l.last_date
),
holdings AS (
    SELECT ticker, MIN(name) AS name, COUNT(*) AS positions,
           SUM(quantity) AS quantity, SUM(quantity * buy_price) AS cost_amount
    FROM portfolio GROUP BY ticker
),
val AS (
    SELECT h.ticker, h.name, h.positions, h.quantity,
           ROUND(h.cost_amount * 1.0 / h.quantity, 2)          AS buy_price,
           lp.close_price,
           ROUND(h.cost_amount, 2)                              AS cost_amount,
           ROUND(h.quantity * lp.close_price, 2)                AS eval_amount
    FROM holdings h JOIN last_price lp ON h.ticker = lp.ticker
)
SELECT ticker, name, positions, quantity, buy_price, close_price, cost_amount, eval_amount,
       ROUND(eval_amount - cost_amount, 2)                              AS pnl,
       ROUND((eval_amount - cost_amount) * 100.0 / cost_amount, 2)      AS pnl_pct,
       ROUND(eval_amount * 100.0 / SUM(eval_amount) OVER (), 2)         AS weight_pct
FROM val
ORDER BY pnl_pct DESC;

-- [A-3] 손익률 상위 3 / 하위 3 종목 (Oracle: LIMIT 대신 FETCH FIRST)
-- @export: sql_A_top_bottom.csv
WITH latest AS (SELECT ticker, MAX(trade_date) AS last_date FROM stock_prices GROUP BY ticker),
last_price AS (SELECT p.ticker, p.close_price FROM stock_prices p JOIN latest l ON p.ticker = l.ticker AND p.trade_date = l.last_date),
holdings AS (SELECT ticker, MIN(name) AS name, SUM(quantity) AS quantity, SUM(quantity * buy_price) AS cost_amount FROM portfolio GROUP BY ticker),
val AS (
    SELECT h.ticker, h.name, ROUND(h.quantity * lp.close_price, 2) AS eval_amount,
           ROUND((h.quantity * lp.close_price - h.cost_amount) * 100.0 / h.cost_amount, 2) AS pnl_pct
    FROM holdings h JOIN last_price lp ON h.ticker = lp.ticker
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY pnl_pct DESC) AS rn_desc,
              ROW_NUMBER() OVER (ORDER BY pnl_pct ASC)  AS rn_asc
    FROM val
)
SELECT ticker, name, eval_amount, pnl_pct,
       CASE WHEN rn_desc <= 3 THEN 'top' ELSE 'bottom' END AS rank
FROM ranked WHERE rn_desc <= 3 OR rn_asc <= 3
ORDER BY pnl_pct DESC;

-- [A-4] 포지션 단위 손익: 가장 잘 산 매수 5건 / 가장 못 산 매수 5건
-- @export: sql_A_positions.csv
WITH latest AS (SELECT ticker, MAX(trade_date) AS last_date FROM stock_prices GROUP BY ticker),
last_price AS (SELECT p.ticker, p.close_price FROM stock_prices p JOIN latest l ON p.ticker = l.ticker AND p.trade_date = l.last_date),
pos AS (
    SELECT pf.position_id, pf.ticker, pf.name, pf.quantity, pf.buy_price, lp.close_price,
           ROUND((lp.close_price - pf.buy_price) * pf.quantity, 2)          AS pnl,
           ROUND((lp.close_price - pf.buy_price) * 100.0 / pf.buy_price, 2) AS pnl_pct
    FROM portfolio pf JOIN last_price lp ON pf.ticker = lp.ticker
),
ranked AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY pnl_pct DESC) AS rn_desc,
              ROW_NUMBER() OVER (ORDER BY pnl_pct ASC)  AS rn_asc
    FROM pos
)
SELECT position_id, ticker, name, quantity, buy_price, close_price, pnl, pnl_pct,
       CASE WHEN rn_desc <= 5 THEN 'best' ELSE 'worst' END AS rank
FROM ranked WHERE rn_desc <= 5 OR rn_asc <= 5
ORDER BY pnl_pct DESC;

-- [A-5] 종목별 거래량 상위 5 (volume 활용, 보유 여부 표시)
-- @export: sql_A_volume.csv
SELECT sp.ticker, SUM(sp.volume) AS total_volume, ROUND(AVG(sp.volume), 0) AS avg_volume,
       CASE WHEN h.ticker IS NULL THEN 'N' ELSE 'Y' END AS held
FROM stock_prices sp
LEFT JOIN (SELECT DISTINCT ticker FROM portfolio) h ON sp.ticker = h.ticker
GROUP BY sp.ticker, h.ticker
ORDER BY total_volume DESC
LIMIT 5;
