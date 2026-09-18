import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <h1 className="header__title">
        <svg
          className="header__icon"
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14" />
          <path d="M11 4h2" />
          <path d="M12 17v.01" />
        </svg>

        <span>Contact Manager</span>
      </h1>

      <p className="header__subtitle">
        Gestiona tus contactos de forma sencilla
      </p>
    </header>
  );
}
