import { useParams, useNavigate } from 'react-router-dom';

export default function BoardDetail() {
  const { id } = useParams(); // Holt die ID aus der URL
  const navigate = useNavigate();

  return (
    <div style={{ padding: '40px', marginTop: '80px', maxWidth: '1200px', margin: '80px auto 0 auto' }}>

      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="icon-btn"
        style={{ marginBottom: '20px', padding: '10px 16px' }}
      >
        ⬅️ Zurück zum Dashboard
      </button>

      <div className="glass-card" style={{ maxWidth: '100%', padding: '35px' }}>
        <h1 style={{ margin: '0 0 10px 0', color: '#fff' }}>📋 Board-Inhalt (ID: {id})</h1>
        <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>
          Hier befindet sich die Detailansicht deines Boards. Du kannst diesen Screen nun nutzen, um Spalten (To Do, In Progress, Done) und Trello-Karten hinzuzufügen!
        </p>

        {/* Platzhalter für deine Trello Spalten */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '40px', overflowX: 'auto', paddingBottom: '20px' }}>

          {/* Beispiel Spalte 1 */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '15px', minWidth: '280px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#a78bfa' }}>⏳ To Do</h4>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              Backend-API absichern
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
              Frontend-Styles verfeinern
            </div>
          </div>

          {/* Beispiel Spalte 2 */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '15px', minWidth: '280px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#34d399' }}>🚀 Done</h4>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', textDecoration: 'line-through', color: '#6b7280' }}>
              Login & Register erstellen
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
