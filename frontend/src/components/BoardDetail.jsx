import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from './AppLayout';

export default function BoardDetail() {
  const { id } = useParams();

  useEffect(() => {
    localStorage.setItem('lastBoardId', id);
  }, [id]);

  return (
    <AppLayout>
      <div className="board-detail-page">
        <div className="glass-card">
          <h1>Board-Inhalt (ID: {id})</h1>
          <p>
            Hier entsteht die Detailansicht für Tickets und Statusspalten.
          </p>

          <div className="ticket-columns">
            <section className="ticket-column">
              <h4>To Do</h4>
              <div className="ticket-card">Backend-API absichern</div>
              <div className="ticket-card">Frontend-Styles verfeinern</div>
            </section>

            <section className="ticket-column">
              <h4>In Progress</h4>
              <div className="ticket-card">Ticket-API anbinden</div>
            </section>

            <section className="ticket-column">
              <h4>Done</h4>
              <div className="ticket-card done">Login & Register erstellen</div>
            </section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
