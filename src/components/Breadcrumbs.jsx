import { Link } from "react-router-dom";
import styles from "./Breadcrumbs.module.css";

export default function Breadcrumbs({ contact }) {
  return (
    <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
      <Link to="/" className={styles["breadcrumbs__link"]}>
        Home
      </Link>

      <span className={styles["breadcrumbs__separator"]} aria-hidden="true">
        {" "}
        &gt;{" "}
      </span>

      <Link to="/search" className={styles["breadcrumbs__link"] + " " + styles["breadcrumbs__item"]}>
        Contacto
      </Link>

      <span className={styles["breadcrumbs__separator"]} aria-hidden="true">
        {" "}
        &gt;{" "}
      </span>

      <Link
        to={`/contact/${contact.id}`}
        className={styles["breadcrumbs__item"] + " " + styles["breadcrumbs__item--active"]}
      >
        {contact.name}
      </Link>
    </nav>
  );
}
