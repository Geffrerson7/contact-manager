import Badge from "./Badge";
import { useNavigate } from "react-router-dom";
import "./ContactCard.css";

export default function ContactCard({
  id,
  name,
  phone,
  email,
  role,
  isFavorite,
  onToggleFavorite,
}) {
  const navigate = useNavigate();

  function handleClick() {
    navigate(`/contact/${id}`);
  }

  return (
    <div
      className={`contact-card ${isFavorite ? "contact-card--favorite" : ""}`}
      onClick={handleClick}
    >
      <div className="contact-card__header">
        <h3 className="contact-card__name">{name}</h3>

        <button
          className="contact-card__favorite-button"
          onClick={function (event) {
            event.stopPropagation();
            onToggleFavorite();
          }}
          aria-label={
            isFavorite
              ? `Quitar a ${name} de favoritos`
              : `Agregar a ${name} a favoritos`
          }
          title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
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

      <div className="contact-card__role">
        <Badge text={role} color="var(--role)" />
      </div>

      <div className="contact-card__info">
        <svg
          className="contact-card__info-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient
              id="phone-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="var(--info-gradient-start)" />
              <stop offset="100%" stopColor="var(--info-gradient-end)" />
            </linearGradient>
          </defs>

          <path stroke="none" d="M0 0h24v24H0z" fill="none" />

          <path
            className="contact-card__info-icon-path"
            d="M9 3a1 1 0 0 1 .877 .519l.051 .11l2 5a1 1 0 0 1 -.313 1.16l-.1 .068l-1.674 1.004l.063 .103a10 10 0 0 0 3.132 3.132l.102 .062l1.005 -1.672a1 1 0 0 1 1.113 -.453l.115 .039l5 2a1 1 0 0 1 .622 .807l.007 .121v4c0 1.657 -1.343 3 -3.06 2.998c-8.579 -.521 -15.418 -7.36 -15.94 -15.998a3 3 0 0 1 2.824 -2.995l.176 -.005h4z"
          />
        </svg>

        <span>{phone}</span>
      </div>

      <p className="contact-card__info">
        <svg
          className="contact-card__info-icon"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <defs>
            <linearGradient
              id="mail-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="var(--info-gradient-start)" />
              <stop offset="100%" stopColor="var(--info-gradient-end)" />
            </linearGradient>
          </defs>

          <path stroke="none" d="M0 0h24v24H0z" fill="none" />

          <path
            fill="url(#mail-gradient)"
            d="M22 7.535v9.465a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-9.465l9.445 6.297l.116 .066a1 1 0 0 0 .878 0l.116 -.066l9.445 -6.297z"
          />

          <path
            fill="url(#mail-gradient)"
            d="M19 4c1.08 0 2.027 .57 2.555 1.427l-9.555 6.37l-9.555 -6.37a2.999 2.999 0 0 1 2.354 -1.42l.201 -.007h14z"
          />
        </svg>
        <span>{email}</span>
      </p>
    </div>
  );
}
