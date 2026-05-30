import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [currentUser, setCurrentUser] = useState('');
  const [boards, setBoards] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [activeBoard, setActiveBoard] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInvDropdown, setShowInvDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [joinBoardId, setJoinBoardId] = useState('');
  const [joinInputPassword, setJoinInputPassword] = useState('');

  useEffect(() => {
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(window.atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          setCurrentUser(payload.sub);
        }
      } catch (e) { console.error(e); }
    }
    fetchBoards();
    fetchInvitations();
  }, [token]);

  const fetchBoards = async () => {
    const res = await fetch('http://localhost:8080/api/boards', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setBoards(await res.json());
  };

  const fetchInvitations = async () => {
    const res = await fetch('http://localhost:8080/api/boards/invitations', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setInvitations(await res.json());
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8080/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description, joinPassword })
    });
    if (res.ok) {
      setShowCreateModal(false);
      setTitle(''); setDescription(''); setJoinPassword('');
      fetchBoards();
    }
  };

  const handleJoinWithPassword = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:8080/api/boards/${joinBoardId}/join?password=${joinInputPassword}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      alert("Erfolgreich beigetreten!");
      setShowJoinModal(false);
      setJoinBoardId(''); setJoinInputPassword('');
      fetchBoards();
    } else {
      alert(`Fehler: ${await res.text()}`);
    }
  };

  const handleEditBoard = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:8080/api/boards/${activeBoard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ title, description, joinPassword })
    });
    if (res.ok) { setShowEditModal(false); fetchBoards(); }
  };

  const openMemberModal = async (board) => {
    setActiveBoard(board);
    const res = await fetch(`http://localhost:8080/api/boards/${board.id}/members`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { setBoardMembers(await res.json()); setShowMemberModal(true); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const res = await fetch(`http://localhost:8080/api/boards/${activeBoard.id}/invite?username=${inviteUsername}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { alert("Eingeladen!"); setInviteUsername(''); openMemberModal(activeBoard); }
    else { alert(`Fehler: ${await res.text()}`); }
  };

  const changeRole = async (memberId, newRole) => {
    await fetch(`http://localhost:8080/api/boards/${activeBoard.id}/members/${memberId}?role=${newRole}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    openMemberModal(activeBoard);
  };

  const acceptInvite = async (id) => {
    await fetch(`http://localhost:8080/api/boards/invitations/${id}/accept`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchInvitations(); fetchBoards();
  };

  const iAmAllowedToEditMembers = () => {
    if (!activeBoard) return false;
    if (activeBoard.owner.username === currentUser) return true;
    const myMemberObj = boardMembers.find(m => m.user.username === currentUser);
    return myMemberObj && (myMemberObj.role === 'OWNER' || myMemberObj.role === 'ADMIN');
  };

  return (
    <div>
      {/* NAVBAR */}
      <nav className="navbar">
        {/* Linke Seite: Logo */}
        <h2>📋 PROJECT HUB</h2>

        {/* Rechte Seite: Aktionen */}
        <div className="nav-actions">

          {/* 1. Einladungs-Glocke */}
          <div className="bell-container">
            <div className="bell-icon" onClick={() => { setShowInvDropdown(!showInvDropdown); setShowUserDropdown(false); }}>
              🔔 {invitations.length > 0 && <span className="badge">{invitations.length}</span>}
            </div>
            {showInvDropdown && (
              <div className="dropdown-menu">
                <h4 style={{margin:'0 0 12px 0', fontSize:'0.95rem', color:'#fff'}}>Einladungen</h4>
                {invitations.length === 0 ? <p style={{fontSize:'0.8rem', color:'#6b7280', margin:0}}>Keine Einladungen</p> :
                  invitations.map(inv => (
                    <div key={inv.id} className="dropdown-item">
                      <p style={{fontSize:'0.85rem', margin:0, color:'#cbd5e1'}}>Von {inv.board.owner.username}: <b>{inv.board.title}</b></p>
                      <button onClick={() => acceptInvite(inv.id)} style={{alignSelf:'flex-start', fontSize:'0.75rem', background:'#4f46e5', border:'none', color:'white', padding:'4px 10px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', marginTop:'5px'}}>Annehmen</button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* 2. Code beitreten Button */}
          <button onClick={() => setShowJoinModal(true)} style={{padding:'10px 16px', background:'rgba(16, 185, 129, 0.1)', border:'1px solid #10b981', color:'#10b981', borderRadius:'8px', cursor:'pointer', fontWeight:'600'}}>🔑 Code Beitreten</button>

          {/* 3. Board erstellen Button */}
          <button onClick={() => setShowCreateModal(true)} className="btn-primary" style={{width:'auto', padding:'10px 16px', margin:0}}>+ Board</button>

          {/* 4. NEU: Username als Dropdown-Button (Ersetzt den alten Logout-Button) */}
          <div className="user-menu-container">
            <button className="user-profile-btn" onClick={() => { setShowUserDropdown(!showUserDropdown); setShowInvDropdown(false); }}>
              👤 {currentUser || 'Profil'} ▾
            </button>

            {showUserDropdown && (
              <div className="dropdown-menu" style={{ width: '180px' }}>
                <div style={{ paddingBottom: '10px', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: '#9ca3af' }}>
                  Eingeloggt als <b style={{color:'#fff'}}>{currentUser}</b>
                </div>
                <button className="logout-dropdown-btn" onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}>
                  🚪 Abmelden
                </button>
              </div>
            )}
          </div>

        </div>
      </nav>

      {/* BOARDS GRID */}
      <div className="board-grid">
        {boards.map(board => {
          const isOwnerOrAdmin = board.owner.username === currentUser;

          return (
            <div key={board.id} className="board-card">
              <div className="board-id-badge">ID: {board.id}</div>
              <h3>{board.title}</h3>
              <p>{board.description}</p>
              <div style={{fontSize:'0.8rem', color:'#6366f1', marginBottom:'15px', fontWeight:'500'}}>Owner: {board.owner.username}</div>

              <div className="card-actions">
                <div className="action-left-group">
                  {isOwnerOrAdmin && (
                    <button className="icon-btn" onClick={() => {
                      setActiveBoard(board); setTitle(board.title); setDescription(board.description); setJoinPassword(board.joinPassword || ''); setShowEditModal(true);
                    }}>✏️ Edit</button>
                  )}
                  <button className="icon-btn" onClick={() => openMemberModal(board)}>👥 Members</button>
                </div>
                <button className="view-btn" onClick={() => navigate(`/board/${board.id}`)}>👁️ Öffnen</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: PER PASSWORT BEITRETEN */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Einem Board beitreten</h3>
            <form onSubmit={handleJoinWithPassword}>
              <div className="input-group"><label>Board ID (Nummer)</label><input type="number" value={joinBoardId} onChange={e=>setJoinBoardId(e.target.value)} required /></div>
              <div className="input-group"><label>Board Passwort</label><input type="password" value={joinInputPassword} onChange={e=>setJoinInputPassword(e.target.value)} required /></div>
              <button type="submit" className="btn-primary">Beitreten</button>
              <button type="button" onClick={()=>setShowJoinModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MEMBERS (MITGLIEDER) */}
      {showMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Mitglieder von "{activeBoard?.title}"</h3>
            {iAmAllowedToEditMembers() && (
              <form onSubmit={handleInvite} style={{display:'flex', gap:'10px', marginBottom:'20px'}}>
                <input type="text" placeholder="User suchen..." value={inviteUsername} onChange={e=>setInviteUsername(e.target.value)} required style={{flex: 1, padding:'12px', borderRadius:'8px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:'0.95rem'}} />
                <button type="submit" style={{background:'#7c3aed', color:'#fff', border:'none', padding:'0 18px', borderRadius:'8px', cursor:'pointer', fontWeight:'600', fontSize:'0.95rem'}}>Einladen</button>
              </form>
            )}
            <div style={{maxHeight:'220px', overflowY:'auto', marginBottom:'10px'}}>
              {boardMembers.map(m => (
                <div key={m.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                  <span style={{fontSize:'0.95rem', color:'#cbd5e1'}}>{m.user.username === activeBoard?.owner.username ? '👑' : '👤'} {m.user.username}</span>
                  {m.role === 'OWNER' ? <span style={{color:'#f59e0b', fontSize:'0.9rem', fontWeight:'600', paddingRight:'10px'}}>Owner</span> : (
                    <select value={m.role} disabled={!iAmAllowedToEditMembers()} onChange={(e) => changeRole(m.id, e.target.value)} style={{background:'#161224', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', padding:'6px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'0.9rem'}}>
                      <option value="ADMIN">Admin</option>
                      <option value="MITARBEITER">Mitarbeiter</option>
                      <option value="BEOBACHTER">Beobachter</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            {/* FIX: Schließen Button gestylt */}
            <button type="button" onClick={()=>setShowMemberModal(false)} className="btn-primary">Schließen</button>
          </div>
        </div>
      )}

      {/* MODAL: CREATE (BOARD ERSTELLEN) */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Neues Board erstellen</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="input-group"><label>Titel</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} required /></div>
              <div className="input-group"><label>Beschreibung</label><input type="text" value={description} onChange={e=>setDescription(e.target.value)} /></div>
              <div className="input-group"><label>Passwort zum Beitreten (optional)</label><input type="password" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)} /></div>
              <button type="submit" className="btn-primary">Erstellen</button>
              <button type="button" onClick={()=>setShowCreateModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT (BOARD BEARBEITEN) */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Board bearbeiten</h3>
            <form onSubmit={handleEditBoard}>
              <div className="input-group"><label>Titel</label><input type="text" value={title} onChange={e=>setTitle(e.target.value)} required /></div>
              <div className="input-group"><label>Beschreibung</label><input type="text" value={description} onChange={e=>setDescription(e.target.value)} /></div>
              <div className="input-group"><label>Passwort ändern</label><input type="password" value={joinPassword} onChange={e=>setJoinPassword(e.target.value)} /></div>
              <button type="submit" className="btn-primary">Speichern</button>
              <button type="button" onClick={()=>setShowEditModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
