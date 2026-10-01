import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import ContactList from "../components/ContactList";
import styles from "./SearchPage.module.css";

export default function SearchPage() {
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

  const [searchParams, setSearchParams] = useSearchParams();
  const activeQuery = searchParams.get("q") || "";

  const [textInput, setTextInput] = useState(activeQuery);

  function handleSubmit(event) {
    event.preventDefault();
    if (textInput.trim()) {
      setSearchParams({ q: textInput.trim() });
    } else {
      setSearchParams({});
    }
  }

  function handleClear() {
    setTextInput("");
    setSearchParams({});
  }

  const filteredContacts = contacts.filter(function (contact) {
    const query = activeQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query) ||
      contact.role.toLowerCase().includes(query)
    );
  });

  function handleDeleteContact(contactId) {
    const updatedContacts = contacts.filter(function (contact) {
      return contact.id !== contactId;
    });

    setContacts(updatedContacts);
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
    <div className={styles["search-page"]}>
      <h2 className={styles["search-page__title"]}>Buscar Contactos</h2>

      <form onSubmit={handleSubmit} className={styles["search-form"]}>
        {/* Contenedor relativo para posicionar la X dentro */}
        <div className={styles["search-input-wrapper"]}>
          <input
            type="text"
            placeholder="Busca por nombre, email o rol..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className={styles["search-input"]}
          />

          {/* El botón "X" aparece dentro si hay texto escrito o una búsqueda activa */}
          {(textInput || activeQuery) && (
            <button
              type="button"
              onClick={handleClear}
              className={styles["search-clear-inline"]}
              aria-label="Limpiar búsqueda"
              title="Limpiar"
            >
              <svg
                xmlns="http://w3.org"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <button type="submit" className={styles["search-submit-button"]}>
          Buscar
        </button>
      </form>

      {filteredContacts.length > 0 ? (
        <ContactList
          contacts={filteredContacts}
          onDeleteContact={handleDeleteContact}
          onToggleFavorite={handleToggleFavorite}
        />
      ) : (
        <p className={styles["no-results"]}>No se encontraron contactos que coincidan.</p>
      )}
    </div>
  );
}
