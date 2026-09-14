# 📱 Contact Manager

Aplicación web desarrollada con **React** y **Vite** para visualizar y gestionar una lista de contactos.

## 🚀 Tecnologías

* React
* Vite
* JavaScript
* CSS
* ESLint

## 📋 Funcionalidades actuales

* Visualización de una lista de contactos.
* Información de cada contacto:

  * Nombre
  * Teléfono
  * Correo electrónico
  * Rol
* Identificación visual de contactos favoritos.
* Indicador de favorito mediante ⭐.
* Estilos diferentes para contactos favoritos.
* Badge reutilizable para mostrar el rol del contacto.
* Diseño responsive básico.
* Estado visual para una lista sin contactos.

## 📁 Estructura del proyecto

```text
src/
├── components/
│   ├── Badge.jsx
│   ├── ContactCard.jsx
│   ├── ContactList.jsx
│   ├── Footer.jsx
│   └── Header.jsx
│
├── App.jsx
├── index.css
└── main.jsx
```

## 🧩 Componentes

### `App`

Componente principal de la aplicación.

Se encarga de:

* Definir los datos iniciales de los contactos.
* Calcular la cantidad de contactos favoritos.
* Integrar los componentes principales de la aplicación.

### `Header`

Muestra el encabezado de la aplicación y una breve descripción.

### `ContactList`

Recibe la lista de contactos mediante props y utiliza `.map()` para renderizar cada contacto.

### `ContactCard`

Representa individualmente la información de un contacto.

Recibe mediante props:

```jsx
name
phone
email
role
isFavorite
```

La tarjeta modifica su apariencia dependiendo de si el contacto está marcado como favorito.

### `Badge`

Componente reutilizable utilizado para mostrar el rol del contacto.

Recibe dos props:

```jsx
<Badge
  text={role}
  color="var(--role)"
/>
```

El componente utiliza `color` para definir el color del texto y `var(--role-bg)` como color de fondo.

Implementación actual:

```jsx
export default function Badge({ text, color }) {
  const badgeStyle = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "12px",
    backgroundColor: "var(--role-bg)",
    color: color,
    fontSize: "14px",
    fontWeight: "600",
  };

  return <span style={badgeStyle}>{text}</span>;
}
```

## 🎨 Estilos

Los colores principales se encuentran definidos como variables CSS en `index.css`.

```css
:root {
  --primary: #f3f4f6;
  --secondary: #646CFF;
  --accent: #b269ea;
  --bg: #16171d;
  --border: #b6b4b8;

  --favorite: #ffd700;
  --favorite-bg: #fffef0;

  --role: #d97706;
  --role-bg: #fff7ed;
}
```

El uso de variables CSS permite reutilizar los colores en diferentes componentes y facilita futuros cambios de diseño.

## 🛠️ Instalación

Clona el repositorio:

```bash
git clone <URL_DEL_REPOSITORIO>
```

Ingresa al proyecto:

```bash
cd contact-manager
```

Instala las dependencias:

```bash
npm install
```

## ▶️ Ejecutar el proyecto

Para iniciar el servidor de desarrollo:

```bash
npm run dev
```

Luego abre en el navegador la URL proporcionada por Vite.

## 🔍 Lint

Para revisar el código utilizando ESLint:

```bash
npm run lint
```

También puedes utilizar:

```bash
npx eslint . --fix
```

para corregir automáticamente algunos problemas que ESLint pueda solucionar.

## 🏗️ Build

Para generar la versión de producción:

```bash
npm run build
```

Para comprobar localmente la versión de producción:

```bash
npm run preview
```

## 📚 Conceptos practicados

Este proyecto permite practicar conceptos fundamentales de React y JavaScript:

* Componentes funcionales
* Props
* Renderizado dinámico
* `.map()`
* Condicionales
* Arrays de objetos
* Estilos inline
* Variables CSS
* Componentes reutilizables
* Renderizado de listas con `key`
* Organización de componentes
* Comunicación entre componentes mediante props

## 🔮 Próximas mejoras

Algunas funcionalidades que podrían incorporarse posteriormente:

* Agregar nuevos contactos.
* Editar contactos.
* Eliminar contactos.
* Marcar y desmarcar favoritos.
* Buscar contactos.
* Filtrar contactos por rol.
* Mostrar todos los contactos o solo favoritos.
* Persistir los datos utilizando `localStorage`.
* Conectar la aplicación con una API REST.

## 👨‍💻 Autor

**Gefferson Casasola Huamancusi**

Ingeniero Electrónico y desarrollador de software.