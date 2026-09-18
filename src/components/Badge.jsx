import "./Badge.css";

export default function Badge({ text, color }) {
  return (
    <span className="badge" style={{ color }}>
      {text}
    </span>
  );
}
