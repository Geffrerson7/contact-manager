import styles from "./Badge.module.css";

export default function Badge({ text, color }) {
  return (
    <span className={styles.badge} style={{ color }}>
      {text}
    </span>
  );
}
