import styles from "./AboutPage.module.css";

export default function AboutPage() {
  return (
    <div className={styles["about-page"]}>
      <div className={styles["about-page__card"]}>
        <h1 className={styles["about-page__title"]}>Acerca de</h1>

        <p className={styles["about-page__name"]}>Contact Manager</p>

        <p className={styles["about-page__version"]}>Versión 1.0</p>

        <p className={styles["about-page__description"]}>
          Contact Manager es una aplicación web desarrollada con React que
          permite gestionar contactos de forma sencilla. Puedes agregar,
          eliminar y marcar contactos como favoritos, además de consultar la
          información detallada de cada contacto.
        </p>
      </div>
    </div>
  );
}
