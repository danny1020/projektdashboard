import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import AppLayout from './AppLayout';
import { loadBoardStats } from '../services/ticketApi';

export default function StatsDashboard() {
  const { boardId } = useParams();
  const token = localStorage.getItem('token');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ZENTRALE KONFIGURATION: Hier kannst du Keywords und Farben festlegen
  const STATUS_CONFIG = {
    'BACKLOG': { label: 'Backlog', color: '#94a3b8' },
    'TODO': { label: 'Zu erledigen', color: '#ef4444' },
    'IN_PROGRESS': { label: 'In Arbeit', color: '#eab308' },
    'IN_TEST': { label: 'In Test', color: '#8b5cf6' },
    'DONE': { label: 'Fertig', color: '#22c55e' }
  };

  // Hilfsfunktion: Findet das Design für einen beliebigen Status-String
  const getStatusInfo = (key) => {
    const upperKey = key.toUpperCase();
    if (upperKey.includes('FERTIG') || upperKey.includes('DONE')) return STATUS_CONFIG['DONE'];
    if (upperKey.includes('ARBEIT') || upperKey.includes('PROGRESS')) return STATUS_CONFIG['IN_PROGRESS'];
    return STATUS_CONFIG[upperKey] || { label: key, color: '#6366f1' };
  };

  useEffect(() => {
    loadBoardStats(boardId, token).then(res => { setData(res); setLoading(false); });
  }, [boardId, token]);

  if (loading) return <AppLayout><div style={{ color: '#fff', padding: '40px' }}>Lädt...</div></AppLayout>;

  // Daten für das Diagramm normalisieren
  const chartData = Object.entries(data.statusCounts).map(([key, value]) => ({
    name: getStatusInfo(key).label,
    value
  }));

  return (
    <AppLayout>
      <div style={{ padding: '40px', color: '#f8fafc', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '32px' }}>📊 Board Analyse</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          {/* Ersetze den gesamten Block unter "Status-Liste" durch diesen Code: */}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Gesamt-Kachel */}
            <div style={cardStyle('#334155', '#fff')}>
              <span style={{ fontWeight: '500' }}>Alle Tickets</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{data.totalTickets}</span>
            </div>

            {/* Dynamische Status-Kacheln */}
            {Object.entries(data.statusCounts).map(([key, count]) => {
              const info = getStatusInfo(key); // info.label und info.color sollten hier gefüllt sein
              return (
                <div key={key} style={cardStyle('#1e293b', info.color)}>
                  <span style={{ fontWeight: '500' }}>{info.label || key}</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Diagramm */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px' }}>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                  {chartData.map((entry, i) => <Cell key={i} fill={getStatusInfo(entry.name).color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// Styling für die Kacheln - Korrigiert mit Anzeige von Count und Label
function cardStyle(bg, count, label, borderColor) {
  return {
    backgroundColor: bg,
    padding: '16px 24px',
    borderRadius: '10px',
    borderLeft: `6px solid ${borderColor}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    color: '#fff' // Textfarbe weiß
  };
}
