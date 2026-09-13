export default function Header() {
  return (
    <header style={{
      textAlign: 'center',
      backgroundColor: 'var(--secondary)',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    }}>
      <h1 style={{ margin: 0 }}>📱 Contact Manager</h1>
      <p style={{ margin: '10px 0 0 0', opacity: 0.9 }}>
        Gestiona tus contactos de forma sencilla
      </p>
    </header>
  );
}