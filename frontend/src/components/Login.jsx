import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token); // JWT Token speichern
        navigate('/dashboard');
      } else {
        alert('Login fehlgeschlagen! Bitte überprüfe deine Daten.');
      }
    } catch (err) {
      alert('Verbindung zum Server fehlgeschlagen.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Willkommen zurück</h2>
        <p>Melde dich an, um auf deine Boards zuzugreifen.</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="dein_username"
              required
            />
          </div>

          <div className="input-group">
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>
            Einloggen
          </button>
        </form>

        <div className="auth-footer">
          Noch kein Konto? <Link to="/register" className="auth-link">Registrieren</Link>
        </div>
      </div>
    </div>
  );
}
