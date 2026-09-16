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

  return (
    <div>
      <Header />
      <p>
        Total: {contacts.length} contactos | Favoritos: {favoriteCount}
      </p>
      <main>
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
          }}
        >
          + Agregar Contacto
        </button>
        <ContactList
          contacts={contacts}
          onDeleteContact={handleDeleteContact}
        />
      </main>
      <Footer />
    </div>
  );
}
