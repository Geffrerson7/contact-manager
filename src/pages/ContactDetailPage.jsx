import { useParams, Link, useNavigate } from "react-router-dom";
import Badge from "../components/Badge";
import "./ContactDetailPage.css";

export default function ContactDetailPage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const currentId = Number(id);
  const previousId = currentId - 1;
  const nextId = currentId + 1;

  // Por ahora, datos hardcodeados (en M2 vendrán de API)
  const contacts = [
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
  ];

  const hasPrevious = contacts.some(function (contact) {
    return contact.id === previousId;
  });

  const hasNext = contacts.some(function (contact) {
    return contact.id === nextId;
  });

  const contact = contacts.find(function (contact) {
    return contact.id === currentId;
  });

  if (!contact) {
    return (
      <div className="contact-detail__not-found">
        <div className="contact-detail__not-found-card">
          <div className="contact-detail__not-found-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
              <path d="M6 21v-2a4 4 0 0 1 4 -4h3.5" />
              <path d="M19 22v.01" />
              <path d="M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483" />
            </svg>
          </div>

          <h2 className="contact-detail__not-found-title">
            Contacto no encontrado
          </h2>

          <p className="contact-detail__not-found-description">
            El contacto que buscas no existe o puede haber sido eliminado.
          </p>

          <Link to="/" className="contact-detail__button">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  function handlePrevious() {
    const previousId = Number(id) - 1;

    if (hasPrevious) {
      navigate(`/contact/${previousId}`);
    }
  }

  function handleNext() {
    if (hasNext) {
      navigate(`/contact/${nextId}`);
    }
  }

  return (
    <main className="contact-detail">
      <div className="contact-detail__back">
        <Link to="/" className="contact-detail__back-link">
          ← Volver al inicio
        </Link>
      </div>

      <section
        className={`contact-detail__card ${
          contact.isFavorite ? "contact-detail__card--favorite" : ""
        }`}
      >
        <div className="contact-detail__header">
          <h1 className="contact-detail__name">{contact.name}</h1>

          <span
            className="contact-detail__favorite"
            aria-label={
              contact.isFavorite ? "Contacto favorito" : "Contacto no favorito"
            }
          >
            {contact.isFavorite ? "⭐" : "☆"}
          </span>
        </div>

        <div className="contact-detail__info">
          <div className="contact-detail__info-item">
            <svg
              className="contact-detail__info-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2" />
            </svg>

            <div className="contact-detail__info-content">
              <small>Teléfono</small>
              <span>{contact.phone}</span>
            </div>
          </div>

          <div className="contact-detail__info-item">
            <svg
              className="contact-detail__info-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
              <path d="M3 7l9 6l9 -6" />
            </svg>

            <div className="contact-detail__info-content">
              <small>Correo electrónico</small>
              <span>{contact.email}</span>
            </div>
          </div>

          <div className="contact-detail__info-item">
            <svg
              className="contact-detail__info-icon contact-detail__info-icon--role"
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 21l18 0" />
              <path d="M5 21v-14l8 -4v18" />
              <path d="M19 21v-10l-6 -4" />
              <path d="M9 9l0 .01" />
              <path d="M9 12l0 .01" />
              <path d="M9 15l0 .01" />
              <path d="M9 18l0 .01" />
            </svg>

            <div className="contact-detail__info-content">
              <small>Rol</small>

              <Badge text={contact.role} color="var(--role)" />
            </div>
          </div>
        </div>
      </section>

      <section className="contact-detail__navigation">
        <button
          className="contact-detail__navigation-button"
          disabled={!hasPrevious}
          onClick={handlePrevious}
        >
          Anterior
        </button>

        <button
          className="contact-detail__navigation-button"
          disabled={!hasNext}
          onClick={handleNext}
        >
          Siguiente
        </button>
      </section>
    </main>
  );
}
