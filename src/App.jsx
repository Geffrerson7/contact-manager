import Header from "./components/Header";
import ContactList from "./components/ContactList";
import Footer from "./components/Footer";

const contacts = [
  {
    id: 1,
    name: "Ana García",
    phone: "+1 (555) 123-4567",
    email: "ana@email.com",
    isFavorite: true,
  },
  {
    id: 2,
    name: "Carlos López",
    phone: "+1 (555) 987-6543",
    email: "carlos@email.com",
    isFavorite: false,
  },
  {
    id: 3,
    name: "María Torres",
    phone: "+1 (555) 456-7890",
    email: "maria@email.com",
    isFavorite: true,
  },
];

export default function App() {
  const favoriteCount = contacts.filter(function (c) {
    return c.isFavorite;
  }).length;

  return (
    <div>
      <Header />
      <p>
        Total: {contacts.length} contactos | Favoritos: {favoriteCount}
      </p>
      <main>
        <ContactList contacts={contacts} />
      </main>
      <Footer />
    </div>
  );
}
