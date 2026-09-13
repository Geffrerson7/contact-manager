import ContactCard from "./ContactCard";

export default function ContactList({ contacts }) {
  if (contacts.length === 0) {
    return <p style={{ color: "var(--empty-text)" }}>No hay contactos</p>;
  }
  return (
    <div> 
      {contacts.map(function (contact) {
        return (
          <ContactCard
            key={contact.id}
            name={contact.name}
            phone={contact.phone}
            email={contact.email}
            role={contact.role}
            isFavorite={contact.isFavorite}
          />
        );
      })}
    </div>
  );
}
