import Header from './components/Header'
import ContactList from './components/ContactList'
import Footer from './components/Footer'

export default function App() {
  return (
    <div>
      <Header />
      <main style={{ padding: '20px' }}>
        <ContactList />
      </main>
      <Footer />
    </div>
  )
}