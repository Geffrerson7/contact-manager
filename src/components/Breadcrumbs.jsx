import { Link } from "react-router-dom";
import "./Breadcrumbs.css";

export default function Breadcrumbs({ contact }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/" className="breadcrumbs__link">
        Home
      </Link>

      <span className="breadcrumbs__separator" aria-hidden="true">
        {" "}
        &gt;{" "}
      </span>

      <Link to="/search" className="breadcrumbs__link breadcrumbs__item">
        Contacto
      </Link>

      <span className="breadcrumbs__separator" aria-hidden="true">
        {" "}
        &gt;{" "}
      </span>

      <Link
        to={`/contact/${contact.id}`}
        className="breadcrumbs__item breadcrumbs__item--active"
      >
        {contact.name}
      </Link>
    </nav>
  );
}
