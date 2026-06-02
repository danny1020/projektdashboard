import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from './AppLayout';

const API_URL = 'http://localhost:8080/api';

const getUsernameFromToken = (token) => {
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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [joinBoardId, setJoinBoardId] = useState('');
  const [joinInputPassword, setJoinInputPassword] = useState('');

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    setCurrentUser(getUsernameFromToken(token));
    fetchBoards();
    fetchInvitations();
  }, [token]);

  const fetchBoards = async () => {
    const res = await fetch(`${API_URL}/boards`, { headers: authHeaders });
    if (res.ok) setBoards(await res.json());
  };

  const fetchInvitations = async () => {
    const res = await fetch(`${API_URL}/boards/invitations`, { headers: authHeaders });
    if (res.ok) setInvitations(await res.json());
  };

  const resetBoardForm = () => {
    setTitle('');
    setDescription('');
    setJoinPassword('');
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/boards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ title, description, joinPassword })
    });

    if (res.ok) {
      setShowCreateModal(false);
      resetBoardForm();
      fetchBoards();
    }
  };

  const handleEditBoard = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/boards/${activeBoard.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ title, description, joinPassword })
    });

    if (res.ok) {
      setShowEditModal(false);
      resetBoardForm();
      fetchBoards();
    }
  };

  const handleJoinWithPassword = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/boards/${joinBoardId}/join?password=${encodeURIComponent(joinInputPassword)}`, {
      method: 'POST',
      headers: authHeaders
    });

    if (res.ok) {
      alert('Erfolgreich beigetreten!');
      setShowJoinModal(false);
      setJoinBoardId('');
      setJoinInputPassword('');
      fetchBoards();
    } else {
      alert(`Fehler: ${await res.text()}`);
    }
  };

  const openBoard = (boardId) => {
    localStorage.setItem('lastBoardId', boardId);
    navigate(`/board/${boardId}`);
  };

  const openEditModal = (board) => {
    setActiveBoard(board);
    setTitle(board.title);
    setDescription(board.description || '');
    setJoinPassword(board.joinPassword || '');
    setShowEditModal(true);
  };

  const openMemberModal = async (board) => {
    setActiveBoard(board);
    const res = await fetch(`${API_URL}/boards/${board.id}/members`, { headers: authHeaders });
    if (res.ok) {
      setBoardMembers(await res.json());
      setShowMemberModal(true);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();

    const res = await fetch(`${API_URL}/boards/${activeBoard.id}/invite?username=${encodeURIComponent(inviteUsername)}`, {
      method: 'POST',
      headers: authHeaders
    });

    if (res.ok) {
      alert('Eingeladen!');
      setInviteUsername('');
      openMemberModal(activeBoard);
    } else {
      alert(`Fehler: ${await res.text()}`);
    }
  };

  const changeRole = async (memberId, newRole) => {
    await fetch(`${API_URL}/boards/${activeBoard.id}/members/${memberId}?role=${newRole}`, {
      method: 'PUT',
      headers: authHeaders
    });
    openMemberModal(activeBoard);
  };

  const acceptInvite = async (id) => {
    await fetch(`${API_URL}/boards/invitations/${id}/accept`, {
      method: 'POST',
      headers: authHeaders
    });
    fetchInvitations();
    fetchBoards();
  };

  const iAmAllowedToEditMembers = () => {
    if (!activeBoard) return false;
    if (activeBoard.owner.username === currentUser) return true;
    const membership = boardMembers.find((member) => member.user.username === currentUser);
    return membership && (membership.role === 'OWNER' || membership.role === 'ADMIN');
  };

  const dashboardActions = (
    <>
      <div className="bell-container">
        <button className="bell-icon" onClick={() => setShowInvDropdown(!showInvDropdown)}>
          🔔 {invitations.length > 0 && <span className="badge">{invitations.length}</span>}
        </button>

        {showInvDropdown && (
          <div className="dropdown-menu">
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff' }}>Einladungen</h4>
            {invitations.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: 0 }}>Keine Einladungen</p>
            ) : (
              invitations.map((invitation) => (
                <div key={invitation.id} className="dropdown-item">
                  <p style={{ fontSize: '0.85rem', margin: 0, color: '#cbd5e1' }}>
                    Von {invitation.board.owner.username}: <b>{invitation.board.title}</b>
                  </p>
                  <button className="small-action-btn" onClick={() => acceptInvite(invitation.id)}>
                    Annehmen
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button className="join-board-btn" onClick={() => setShowJoinModal(true)}>Code beitreten</button>
      <button className="btn-primary header-primary-btn" onClick={() => setShowCreateModal(true)}>+ Board</button>
    </>
  );

  return (
    <AppLayout currentUser={currentUser} actions={dashboardActions}>
      <div className="board-grid">
        {boards.map((board) => {
          const isOwner = board.owner.username === currentUser;

          return (
            <div key={board.id} className="board-card">
              <div className="board-id-badge">ID: {board.id}</div>
              <h3>{board.title}</h3>
              <p>{board.description}</p>
              <div style={{ fontSize: '0.8rem', color: '#6366f1', marginBottom: '15px', fontWeight: '500' }}>
                Owner: {board.owner.username}
              </div>

              <div className="card-actions">
                <div className="action-left-group">
                  {isOwner && (
                    <button className="icon-btn" onClick={() => openEditModal(board)}>Edit</button>
                  )}
                  <button className="icon-btn" onClick={() => openMemberModal(board)}>Members</button>
                </div>
                <button className="view-btn" onClick={() => openBoard(board.id)}>Öffnen</button>
              </div>
            </div>
          );
        })}
      </div>

      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Einem Board beitreten</h3>
            <form onSubmit={handleJoinWithPassword}>
              <div className="input-group">
                <label>Board ID</label>
                <input type="number" value={joinBoardId} onChange={(e) => setJoinBoardId(e.target.value)} required />
              </div>
              <div className="input-group">
                <label>Board Passwort</label>
                <input type="password" value={joinInputPassword} onChange={(e) => setJoinInputPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary">Beitreten</button>
              <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Mitglieder von "{activeBoard?.title}"</h3>

            {iAmAllowedToEditMembers() && (
              <form onSubmit={handleInvite} className="inline-form">
                <input type="text" placeholder="User suchen..." value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} required />
                <button type="submit">Einladen</button>
              </form>
            )}

            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '10px' }}>
              {boardMembers.map((member) => (
                <div key={member.id} className="member-row">
                  <span>{member.user.username === activeBoard?.owner.username ? 'Owner' : member.user.username}</span>
                  {member.role === 'OWNER' ? (
                    <span className="owner-label">Owner</span>
                  ) : (
                    <select value={member.role} disabled={!iAmAllowedToEditMembers()} onChange={(e) => changeRole(member.id, e.target.value)}>
                      <option value="ADMIN">Admin</option>
                      <option value="MITARBEITER">Mitarbeiter</option>
                      <option value="BEOBACHTER">Beobachter</option>
                    </select>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setShowMemberModal(false)} className="btn-primary">Schließen</button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Neues Board erstellen</h3>
            <form onSubmit={handleCreateBoard}>
              <div className="input-group"><label>Titel</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="input-group"><label>Beschreibung</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="input-group"><label>Passwort zum Beitreten</label><input type="password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} /></div>
              <button type="submit" className="btn-primary">Erstellen</button>
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Board bearbeiten</h3>
            <form onSubmit={handleEditBoard}>
              <div className="input-group"><label>Titel</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              <div className="input-group"><label>Beschreibung</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="input-group"><label>Passwort ändern</label><input type="password" value={joinPassword} onChange={(e) => setJoinPassword(e.target.value)} /></div>
              <button type="submit" className="btn-primary">Speichern</button>
              <button type="button" onClick={() => setShowEditModal(false)} className="btn-secondary">Abbrechen</button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
