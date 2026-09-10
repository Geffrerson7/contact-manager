export default function ContactCard() {
  return (
    <div style={{
      border: '1px solid var(--border)',
      padding: '15px',
      margin: '10px',
      borderRadius: '5px'
    }}>
      <h3 style={{ color: 'var(--secondary)' }}>John Doe</h3>
      <p>📱 Teléfono: +51 956842587</p>
      <p>✉️ Email: john@email.com</p>
    </div>
  );
}