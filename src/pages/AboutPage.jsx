import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-page__card">
        <h1 className="about-page__title">Acerca de</h1>

        <p className="about-page__name">Contact Manager</p>

        <p className="about-page__version">Versión 1.0</p>

        <p className="about-page__description">
          Contact Manager es una aplicación web desarrollada con React que
          permite gestionar contactos de forma sencilla. Puedes agregar,
          eliminar y marcar contactos como favoritos, además de consultar la
          información detallada de cada contacto.
        </p>
      </div>
    </div>
  );
}
