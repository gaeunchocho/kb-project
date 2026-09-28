export default function StatusMessage({ status, error, emptyText, children }) {
  if (status === "loading") {
    return <p className="status status-loading">불러오는 중…</p>;
  }

  if (status === "error") {
    return (
      <p className="status status-error" role="alert">
        {error || "데이터를 불러오지 못했습니다."}
      </p>
    );
  }

  if (status === "empty") {
    return <p className="status status-empty">{emptyText || "표시할 데이터가 없습니다."}</p>;
  }

  return children;
}
