import ContactCard from "./ContactCard";

export default function ContactList({ contacts, onDeleteContact }) {
  if (contacts.length === 0) {
    return <p style={{ color: "var(--empty-text)" }}>No hay contactos</p>;
  }

  return (
    <div>
      {contacts.map(function (contact) {
        return (
          <div
            key={contact.id}
            style={{
              position: "relative",
              marginBottom: "10px",
            }}
          >
            <ContactCard
              name={contact.name}
              phone={contact.phone}
              email={contact.email}
              role={contact.role}
              isFavorite={contact.isFavorite}
            />

            <button
              onClick={function () {
                onDeleteContact(contact.id);
              }}
              aria-label={`Eliminar a ${contact.name}`}
              title="Eliminar contacto"
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0",
                backgroundColor: "#ff4444",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7l16 0" />
                <path d="M10 11l0 6" />
                <path d="M14 11l0 6" />
                <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
                <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
