import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem("theme");

    return savedTheme === "dark";
  });

  useEffect(() => {
    const theme = isDark ? "dark" : "light";

    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [isDark]);

  function handleToggleTheme() {
    setIsDark(function (currentValue) {
      return !currentValue;
    });
  }

  return (
    <button
      type="button"
      className="navbar__theme-toggle"
      onClick={handleToggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v1" />
          <path d="M12 20v1" />
          <path d="M4.22 4.22l.7.7" />
          <path d="M19.07 19.07l.7.7" />
          <path d="M3 12h1" />
          <path d="M20 12h1" />
          <path d="M4.93 19.07l.7-.7" />
          <path d="M18.36 5.64l.7-.7" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3c.132 0 .263 0 .393.008a8.5 8.5 0 0 0 8.599 8.599c.005.13.008.261.008.393a9 9 0 1 1-9-9z" />
        </svg>
      )}
    </button>
  );
}
