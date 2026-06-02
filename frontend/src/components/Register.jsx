import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, confirmPassword: password })
      });

      if (res.ok) {
        alert('Registrierung erfolgreich! Du wirst zum Login weitergeleitet.');
        navigate('/login');
      } else {
        alert(`Registrierung fehlgeschlagen: ${await res.text()}`);
      }
    } catch (err) {
      alert('Verbindung zum Server fehlgeschlagen.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Konto erstellen</h2>
        <p>Registriere dich, um eigene Boards zu verwalten.</p>

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="wähle einen usernamen"
              required
            />
          </div>

          <div className="input-group">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="sicheres passwort"
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
            Konto erstellen
          </button>
        </form>

        <div className="auth-footer">
          Bereits registriert? <Link to="/login" className="auth-link">Hier einloggen</Link>
        </div>
      </div>
    </div>
  );
}
