export default function Copyright() {
  const currentYear = new Date().getFullYear();

  return (
    <p className="copyright">
      &copy; {currentYear} Gefferson Casasola. All rights reserved.
    </p>
  );
}
