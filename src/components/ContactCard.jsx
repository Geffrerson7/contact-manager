export default function ContactCard({ name, phone, email, isFavorite }) {
  const cardStyle = {
    border: isFavorite ? "2px solid var(--favorite)" : "1px solid var(--border)",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "10px",
    backgroundColor: isFavorite ? "var(--favorite-bg)" : "var(--card-bg)",
    color: isFavorite ? "#000" : "var(--card-text)",
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: "0 0 10px 0" }}>
        {name}
        <span style={{ marginLeft: "10px" }}>{isFavorite ? "⭐" : "☆"}</span>
      </h3>
      <p style={{ margin: "5px 0", color: "var(--muted-text)" }}>📞 {phone}</p>
      <p style={{ margin: "5px 0", color: "var(--muted-text)" }}>✉️ {email}</p>
    </div>
  );
}
