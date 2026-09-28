import StatusMessage from "./StatusMessage";

export default function AiBriefing({ status, error, text }) {
  const empty = status === "success" && (!text || !text.trim());

  return (
    <section className="panel briefing-panel">
      <h2>AI 브리핑</h2>
      <StatusMessage
        status={empty ? "empty" : status}
        error={error}
        emptyText="브리핑 문장이 없습니다."
      >
        <p className="briefing-text">{text}</p>
      </StatusMessage>
    </section>
  );
}
