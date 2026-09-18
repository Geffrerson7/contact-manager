import ContactCard from "./ContactCard";
import "./ContactList.css";

export default function ContactList({
  contacts,
  onDeleteContact,
  onToggleFavorite,
}) {
  if (contacts.length === 0) {
    return <p className="contact-list__empty">No hay contactos</p>;
  }

  return (
    <div className="contact-list">
      {contacts.map(function (contact) {
        return (
          <div className="contact-list__item" key={contact.id}>
            <ContactCard
              id={contact.id}
              name={contact.name}
              phone={contact.phone}
              email={contact.email}
              role={contact.role}
              isFavorite={contact.isFavorite}
              onToggleFavorite={function () {
                onToggleFavorite(contact.id);
              }}
            />

            <button
              className="contact-list__delete-button"
              onClick={function (event) {
                event.stopPropagation();
                onDeleteContact(contact.id);
              }}
              aria-label={`Eliminar a ${contact.name}`}
              title="Eliminar contacto"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
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
