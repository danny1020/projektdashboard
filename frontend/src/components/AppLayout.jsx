import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const getCurrentUser = () => {
  const token = localStorage.getItem('token');
  if (!token) return '';

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return '';
    const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || '';
  } catch (e) {
    return '';
  }
};

export default function AppLayout({ children, actions, currentUser }) {
  const navigate = useNavigate();
  const username = currentUser || getCurrentUser();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lastBoardId');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="app-header-left">
          <h2>PROJECT HUB</h2>
          <nav className="main-nav">
            <NavLink to="/boards" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Boards
            </NavLink>
          </nav>
        </div>

        <div className="nav-actions">
          {actions}
          <ThemeToggle />
          <button className="user-profile-btn" onClick={handleLogout}>
            {username || 'Profil'} | Abmelden
          </button>
        </div>
      </header>

      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
