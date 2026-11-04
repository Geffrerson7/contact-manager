import Link from "next/link";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/search", label: "Buscar" },
  { href: "/contact/new", label: "Nuevo contacto" },
  { href: "/about", label: "Acerca de" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
        >
          Contact Manager
        </Link>
        <nav aria-label="Navegación principal">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
