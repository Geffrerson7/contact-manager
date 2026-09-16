import Badge from "./Badge";

export default function ContactCard({
  name,
  phone,
  email,
  role,
  isFavorite,
  onToggleFavorite,
}) {
  const cardStyle = {
    border: isFavorite
      ? "2px solid var(--favorite)"
      : "1px solid var(--border)",
    borderRadius: "8px",
    padding: "15px",
    marginBottom: "10px",
    backgroundColor: isFavorite ? "var(--favorite-bg)" : "var(--card-bg)",
    color: isFavorite ? "#000" : "var(--card-text)",
  };

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0 }}>{name}</h3>

        <button
          onClick={onToggleFavorite}
          aria-label={
            isFavorite
              ? `Quitar a ${name} de favoritos`
              : `Agregar a ${name} a favoritos`
          }
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          style={{
            padding: "0",
            border: "none",
            background: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isFavorite ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="var(--favorite)"
              stroke="var(--favorite)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--muted-text)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873l-6.158 -3.245" />
            </svg>
          )}
        </button>
      </div>
      <div style={{ margin: "5px 0" }}>
        <Badge text={role} color="var(--role)" />
      </div>
      <p style={{ margin: "5px 0", color: "var(--muted-text)" }}>📞 {phone}</p>
      <p style={{ margin: "5px 0", color: "var(--muted-text)" }}>✉️ {email}</p>
    </div>
  );
}
