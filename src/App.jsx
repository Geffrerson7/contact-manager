import Header from "./components/Header";
import ContactList from "./components/ContactList";
import Footer from "./components/Footer";
import { useState } from "react";

export default function App() {
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

  const favoriteCount = contacts.filter(function (c) {
    return c.isFavorite;
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

  return (
    <div>
      <Header />
      <p>
        Total: {contacts.length} contactos | Favoritos: {favoriteCount}
      </p>
      <main>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleAddContact}
            style={{
              marginBottom: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-users-plus"
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
            onClick={handleDeleteAllContacts}
            style={{
              marginBottom: "1rem",
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              backgroundColor: "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="icon icon-tabler icons-tabler-outline icon-tabler-trash-x"
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
        />
      </main>
      <Footer />
    </div>
  );
}
