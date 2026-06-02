import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import { createTicket, loadBoardMembers, loadTickets, moveTicket, updateTicket } from '../services/ticketApi';

const TICKET_STATUSES = [
  { value: 'TODO', label: 'Zu tun' },
  { value: 'IN_PROGRESS', label: 'In Arbeit' },
  { value: 'IN_TEST', label: 'In Test' },
  { value: 'DONE', label: 'Erledigt' }
];

const TICKET_TYPES = ['Aufgabe', 'Bug', 'Feature'];

const TICKET_PRIORITIES = [
  { value: '', label: 'nicht gesetzt' },
  { value: 'Niedrig', label: 'Niedrig' },
  { value: 'Mittel', label: 'Mittel' },
  { value: 'Hoch', label: 'Hoch' }
];

const createEmptyTicketForm = () => ({
  title: '',
  description: '',
  type: 'Aufgabe',
  priority: '',
  status: 'TODO',
  assigneeUsername: ''
});

export default function BoardDetail() {
  const { id } = useParams();
  const token = localStorage.getItem('token');

  const [tickets, setTickets] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [ticketForm, setTicketForm] = useState(createEmptyTicketForm());
  const [ticketModalMode, setTicketModalMode] = useState('create');
  const [activeTicket, setActiveTicket] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [activeDropStatus, setActiveDropStatus] = useState('');
  const [dropTarget, setDropTarget] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const draggedTicketRef = useRef(null);
  const ignoreNextTicketClickRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('lastBoardId', id);
    fetchTickets();
    fetchBoardMembers();
  }, [id]);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError('');

    try {
      setTickets(await loadTickets(id, token));
    } catch (err) {
      setError(err.message || 'Tickets konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoardMembers = async () => {
    try {
      setBoardMembers(await loadBoardMembers(id, token));
    } catch (err) {
      setBoardMembers([]);
    }
  };

  const getTicketsByStatus = (status) => {
    return tickets
      .filter((ticket) => ticket.status === status)
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  };

  const getMemberUsername = (member) => {
    return member.user?.username || member.username || '';
  };

  const getTicketAssigneeValue = (ticket) => {
    if (ticket.assignee?.username) return ticket.assignee.username;
    if (ticket.assigneeUsername) return ticket.assigneeUsername;
    if (ticket.assignedTo) return ticket.assignedTo;
    return '';
  };

  const getTicketAssigneeLabel = (ticket) => {
    return getTicketAssigneeValue(ticket) || 'nicht zugewiesen';
  };

  const openCreateModal = () => {
    setTicketModalMode('create');
    setActiveTicket(null);
    setTicketForm(createEmptyTicketForm());
    setIsTicketModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setTicketModalMode('edit');
    setActiveTicket(ticket);
    setTicketForm({
      title: ticket.title || '',
      description: ticket.description || '',
      type: ticket.type || 'Aufgabe',
      priority: ticket.priority || '',
      status: ticket.status || 'TODO',
      assigneeUsername: getTicketAssigneeValue(ticket)
    });
    setIsTicketModalOpen(true);
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setActiveTicket(null);
    setTicketForm(createEmptyTicketForm());
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const payload = {
      title: ticketForm.title,
      description: ticketForm.description,
      type: ticketForm.type,
      priority: ticketForm.priority,
      status: ticketForm.status,
      assigneeUsername: ticketForm.assigneeUsername
    };

    try {
      if (ticketModalMode === 'create') {
        await createTicket({ ...payload, boardId: Number(id) }, token);
      } else {
        await updateTicket(activeTicket.id, payload, token);
      }

      closeTicketModal();
      await fetchTickets();
    } catch (err) {
      setError(err.message || 'Ticket konnte nicht gespeichert werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveTicket = async (ticket, status, orderIndex) => {
    setIsSaving(true);
    setError('');

    try {
      await moveTicket(ticket.id, { status, orderIndex }, token);
      await fetchTickets();
    } catch (err) {
      setError(err.message || 'Ticket konnte nicht verschoben werden.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTicketDragStart = (event, ticket) => {
    if (isSaving) return;

    draggedTicketRef.current = ticket;
    ignoreNextTicketClickRef.current = true;
    setDraggedTicketId(ticket.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(ticket.id));
  };

  const handleTicketDragEnd = () => {
    draggedTicketRef.current = null;
    setDraggedTicketId(null);
    setActiveDropStatus('');
    setDropTarget(null);

    window.setTimeout(() => {
      ignoreNextTicketClickRef.current = false;
    }, 150);
  };

  const handleColumnDragOver = (event, status) => {
    if (!draggedTicketRef.current || isSaving) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setActiveDropStatus(status);

    if (!event.target.closest?.('.ticket-card')) {
      setDropTarget(null);
    }
  };

  const handleColumnDragLeave = (event, status) => {
    if (activeDropStatus === status && !event.currentTarget.contains(event.relatedTarget)) {
      setActiveDropStatus('');
    }
  };

  const handleColumnDrop = (event, status) => {
    event.preventDefault();

    const draggedTicket = draggedTicketRef.current
      || tickets.find((ticket) => String(ticket.id) === event.dataTransfer.getData('text/plain'));

    draggedTicketRef.current = null;
    setDraggedTicketId(null);
    setActiveDropStatus('');
    setDropTarget(null);

    window.setTimeout(() => {
      ignoreNextTicketClickRef.current = false;
    }, 150);

    if (!draggedTicket || isSaving) return;

    const targetOrderIndex = calculateDropOrderIndex(status, draggedTicket.id);
    if (draggedTicket.status === status && (draggedTicket.orderIndex ?? 0) === targetOrderIndex) return;

    handleMoveTicket(draggedTicket, status, targetOrderIndex);
  };

  const handleTicketDragOver = (event, status, ticket) => {
    if (!draggedTicketRef.current || isSaving || draggedTicketRef.current.id === ticket.id) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const cardBounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < cardBounds.top + cardBounds.height / 2 ? 'before' : 'after';
    setActiveDropStatus(status);
    setDropTarget({ ticketId: ticket.id, status, position });
  };

  const calculateDropOrderIndex = (status, draggedTicketIdValue) => {
    const targetTickets = getTicketsByStatus(status)
      .filter((ticket) => ticket.id !== draggedTicketIdValue);

    if (!dropTarget || dropTarget.status !== status) {
      return targetTickets.length;
    }

    const targetTicketIndex = targetTickets.findIndex((ticket) => ticket.id === dropTarget.ticketId);
    if (targetTicketIndex === -1) {
      return targetTickets.length;
    }

    return dropTarget.position === 'after' ? targetTicketIndex + 1 : targetTicketIndex;
  };

  const handleTicketCardKeyDown = (event, ticket) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openEditModal(ticket);
    }
  };

  const handleTicketCardClick = (ticket) => {
    if (ignoreNextTicketClickRef.current) return;
    openEditModal(ticket);
  };

  return (
    <AppLayout>
      <div className="board-detail-page">
        <div className="glass-card">
          <div className="board-detail-header">
            <div>
              <h1>Board (ID: {id})</h1>
              <p>Tickets werden nach ihrem Status in den Spalten angezeigt.</p>
            </div>
            <div className="board-header-actions">
              <button className="btn-secondary refresh-btn" onClick={fetchTickets} disabled={isLoading || isSaving}>
                Aktualisieren
              </button>
              <button className="btn-primary new-ticket-btn" onClick={openCreateModal} disabled={isSaving}>
                + Neues Ticket
              </button>
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {isLoading ? (
            <div className="empty-state">Tickets werden geladen...</div>
          ) : (
            <div className="ticket-columns">
              {TICKET_STATUSES.map((status) => {
                const columnTickets = getTicketsByStatus(status.value);

                return (
                  <section
                    className={activeDropStatus === status.value ? 'ticket-column drop-active' : 'ticket-column'}
                    key={status.value}
                    onDragOver={(event) => handleColumnDragOver(event, status.value)}
                    onDragLeave={(event) => handleColumnDragLeave(event, status.value)}
                    onDrop={(event) => handleColumnDrop(event, status.value)}
                  >
                    <div className="ticket-column-header">
                      <h4>{status.label}</h4>
                      <span>{columnTickets.length}</span>
                    </div>

                    {columnTickets.length === 0 && (
                      <div className="empty-state">Keine Tickets</div>
                    )}

                    {columnTickets.map((ticket) => (
                      <div
                        className={[
                          ticket.status === 'DONE' ? 'ticket-card done' : 'ticket-card',
                          draggedTicketId === ticket.id ? 'dragging' : '',
                          dropTarget?.ticketId === ticket.id && dropTarget.position === 'before' ? 'drop-before' : '',
                          dropTarget?.ticketId === ticket.id && dropTarget.position === 'after' ? 'drop-after' : ''
                        ].filter(Boolean).join(' ')}
                        key={ticket.id}
                        role="button"
                        tabIndex={0}
                        draggable={!isSaving}
                        onClick={() => handleTicketCardClick(ticket)}
                        onKeyDown={(event) => handleTicketCardKeyDown(event, ticket)}
                        onDragStart={(event) => handleTicketDragStart(event, ticket)}
                        onDragOver={(event) => handleTicketDragOver(event, status.value, ticket)}
                        onDragEnd={handleTicketDragEnd}
                      >
                        <strong>{ticket.title}</strong>
                        {ticket.description && <p>{ticket.description}</p>}

                        <div className="ticket-meta">
                          <span>Priorität: {ticket.priority || 'nicht gesetzt'}</span>
                          <span>Typ: {ticket.type || 'Aufgabe'}</span>
                          <span>Bearbeiter: {getTicketAssigneeLabel(ticket)}</span>
                        </div>
                      </div>
                    ))}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isTicketModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content ticket-modal">
            <h3>{ticketModalMode === 'create' ? 'Neues Ticket' : 'Ticket bearbeiten'}</h3>
            <form className="ticket-modal-form" onSubmit={handleTicketSubmit}>
              <div className="input-group full-width">
                <label>Titel</label>
                <input
                  type="text"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="input-group full-width">
                <label>Beschreibung</label>
                <textarea
                  rows="4"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>Typ</label>
                <select
                  value={ticketForm.type}
                  onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}
                >
                  {TICKET_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Priorität</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                >
                  {TICKET_PRIORITIES.map((priority) => (
                    <option key={priority.value || 'empty'} value={priority.value}>{priority.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Status</label>
                <select
                  value={ticketForm.status}
                  onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}
                >
                  {TICKET_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Zugewiesen an</label>
                <select
                  value={ticketForm.assigneeUsername}
                  onChange={(e) => setTicketForm({ ...ticketForm, assigneeUsername: e.target.value })}
                >
                  <option value="">nicht zugewiesen</option>
                  {boardMembers.map((member) => {
                    const username = getMemberUsername(member);
                    if (!username) return null;
                    return <option key={member.id || username} value={username}>{username}</option>;
                  })}
                </select>
              </div>

              <div className="modal-actions full-width">
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {ticketModalMode === 'create' ? 'Erstellen' : 'Speichern'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeTicketModal} disabled={isSaving}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
