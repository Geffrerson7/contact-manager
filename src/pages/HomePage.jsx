import { useState } from "react";
import ContactList from "../components/ContactList";
import "./HomePage.css";

export default function HomePage() {
  const [contacts, setContacts] = useState([
    {
      id: 1,
      name: "Ana García",
      phone: "+1 (555) 123-4567",
      email: "ana@email.com",
      role: "Amigo",
      isFavorite: true,
    },
    {
      id: 2,
      name: "Carlos López",
      phone: "+1 (555) 987-6543",
      email: "carlos@email.com",
      role: "Trabajo",
      isFavorite: false,
    },
    {
      id: 3,
      name: "María Torres",
      phone: "+1 (555) 456-7890",
      email: "maria@email.com",
      role: "Familia",
      isFavorite: true,
    },
  ]);

  const favoriteCount = contacts.filter(function (contact) {
    return contact.isFavorite;
  }).length;

  function handleAddContact() {
    const newContact = {
      id: contacts.length + 1,
      name: `Nuevo Contacto ${contacts.length + 1}`,
      phone: "000-0000",
      email: "nuevo@email.com",
      role: "Amigo",
      isFavorite: false,
    };

    setContacts([...contacts, newContact]);
  }

  function handleDeleteContact(contactId) {
    const updatedContacts = contacts.filter(function (contact) {
      return contact.id !== contactId;
    });

    setContacts(updatedContacts);
  }

  function handleDeleteAllContacts() {
    setContacts([]);
  }

  function handleToggleFavorite(contactId) {
    const updatedContacts = contacts.map(function (contact) {
      if (contact.id === contactId) {
        return {
          ...contact,
          isFavorite: !contact.isFavorite,
        };
      }

      return contact;
    });

    setContacts(updatedContacts);
  }

  return (
    <div className="home-page">
      <p className="home-page__summary">
        Total: {contacts.length} contactos | Favoritos: {favoriteCount}
      </p>

      <main className="home-page__main">
        <div className="home-page__actions">
          <button
            className="home-page__button home-page__button--add"
            onClick={handleAddContact}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              <path d="M3 21v-2a4 4 0 0 1 4 -4h4c.96 0 1.84 .338 2.53 .901" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              <path d="M16 19h6" />
              <path d="M19 16v6" />
            </svg>
            Agregar Contacto
          </button>

          <button
            className="home-page__button home-page__button--delete"
            onClick={handleDeleteAllContacts}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M4 7h16" />
              <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
              <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
              <path d="M10 12l4 4m0 -4l-4 4" />
            </svg>
            Eliminar Todos los Contactos
          </button>
        </div>

        <ContactList
          contacts={contacts}
          onDeleteContact={handleDeleteContact}
          onToggleFavorite={handleToggleFavorite}
        />
      </main>
    </div>
  );
}
