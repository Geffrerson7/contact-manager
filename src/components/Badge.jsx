export default function Badge({ text, color }) {
  const badgeStyle = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    backgroundColor: "var(--role-bg)",
    color: color,
    fontSize: "14px",
    fontWeight: "600",
  };

  return <span style={badgeStyle}>{text}</span>;
}