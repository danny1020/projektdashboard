import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import { loadTickets } from '../services/ticketApi';

const STATUS_COLORS = ['#38bdf8', '#f59e0b', '#a78bfa', '#22c55e', '#f472b6', '#fb7185', '#2dd4bf', '#eab308'];

const PRIORITIES = [
  { value: 'Hoch', label: 'Hoch', color: '#ef4444' },
  { value: 'Mittel', label: 'Mittel', color: '#f59e0b' },
  { value: 'Niedrig', label: 'Niedrig', color: '#22c55e' }
];

const ASSIGNEE_COLORS = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#f97316', '#eab308', '#60a5fa'];

export default function StatsDashboard() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [tickets, setTickets] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');

    loadTickets(boardId, token)
      .then((loadedTickets) => {
        setTickets(loadedTickets);
        setColumns(readBoardColumns(boardId));
      })
      .catch((err) => setError(err.message || 'Analyse konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [boardId, token]);

  const boardTitle = tickets[0]?.boardTitle || `Board ${boardId}`;

  const statusRows = useMemo(() => {
    // Es gibt aktuell keine separate Kennzeichnung für Abschluss-Spalten.
    // Tickets referenzieren Spalten aktuell über den technischen Status-Key, nicht über eine Spalten-ID.
    // Die Analyse leitet deshalb nichts aus Namen wie "Erledigt" ab.
    return columns.map((column, index) => ({
      ...column,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
      count: tickets.filter((ticket) => String(ticket.status) === String(column.value)).length
    }));
  }, [columns, tickets]);

  const priorityRows = useMemo(() => {
    return PRIORITIES.map((priority) => ({
      ...priority,
      count: tickets.filter((ticket) => ticket.priority === priority.value).length
    }));
  }, [tickets]);

  const assigneeRows = useMemo(() => {
    const counts = tickets.reduce((result, ticket) => {
      const assignee = ticket.assigneeUsername || ticket.assignee?.username || 'Nicht zugewiesen';
      result[assignee] = (result[assignee] || 0) + 1;
      return result;
    }, {});

    if (!counts['Nicht zugewiesen']) {
      counts['Nicht zugewiesen'] = 0;
    }

    return Object.entries(counts)
      .sort(([firstName], [secondName]) => {
        if (firstName === 'Nicht zugewiesen') return 1;
        if (secondName === 'Nicht zugewiesen') return -1;
        return firstName.localeCompare(secondName);
      })
      .map(([label, count], index) => ({
        label,
        count,
        color: label === 'Nicht zugewiesen' ? '#94a3b8' : ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length]
      }));
  }, [tickets]);

  if (loading) {
    return (
      <AppLayout>
        <main className="stats-page">
          <div className="empty-state">Analyse wird geladen...</div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="stats-page">
        <div className="stats-header">
          <button className="btn-secondary stats-back-btn" type="button" onClick={() => navigate(`/board/${boardId}`)}>
            ← Zurück zum Board
          </button>
          <div>
            <h1>Analyse – {boardTitle}</h1>
            <p>Auswertung der vorhandenen Tickets nach Status, Priorität und Zuständigkeit.</p>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <section className="stats-layout">
          <div className="stats-status-list">
            <div className="stats-card total">
              <span>Alle Tickets</span>
              <strong>{tickets.length}</strong>
            </div>

            {statusRows.map((status) => (
              <div className="stats-card" style={{ borderLeftColor: status.color }} key={status.value}>
                <span>{status.label}</span>
                <strong>{status.count}</strong>
              </div>
            ))}
          </div>

          <div className="stats-chart-panel">
            <BarSection title="Tickets nach Priorität" rows={priorityRows} />
            <BarSection title="Tickets pro Zuständigem" rows={assigneeRows} />
          </div>
        </section>
      </main>
    </AppLayout>
  );
}

function BarSection({ title, rows }) {
  const maxCount = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="bar-section">
      <h2>{title}</h2>
      <div className="bar-list">
        {rows.map((row) => (
          <div className="bar-row" key={row.label}>
            <div className="bar-label">
              <span>{row.label}</span>
              <strong>{row.count}</strong>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(row.count / maxCount) * 100}%`,
                  backgroundColor: row.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function readBoardColumns(boardId) {
  try {
    const savedColumns = JSON.parse(localStorage.getItem(`board_cols_${boardId}`) || '[]');
    return Array.isArray(savedColumns) ? savedColumns : [];
  } catch (error) {
    return [];
  }
}
