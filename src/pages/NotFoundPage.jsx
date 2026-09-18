import { Link } from "react-router-dom";
import "./NotFoundPage.css";

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-page__card">
        <h1 className="not-found-page__code">404</h1>

        <h2 className="not-found-page__title">Página no encontrada</h2>

        <p className="not-found-page__description">
          La página que buscas no existe o puede haber sido movida.
        </p>

        <Link to="/" className="not-found-page__link">
          ← Volver al inicio
        </Link>
      </div>
    </div>
  );
}
