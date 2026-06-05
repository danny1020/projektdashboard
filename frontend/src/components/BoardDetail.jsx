import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import AppLayout from './AppLayout';
import {
  createTicket,
  loadBoardMembers,
  loadTickets,
  moveTicket,
  updateTicket,
  deleteTicket,
  deleteColumn,
  createColumnApi,
  updateColumnApi,
  createComment,
  deleteCommentApi
} from '../services/ticketApi';

const TICKET_TYPES = ['Task', 'Bug', 'Feature'];

const TICKET_PRIORITIES = [
  { value: '', label: 'nicht gesetzt' },
  { value: 'Niedrig', label: 'Niedrig' },
  { value: 'Mittel', label: 'Mittel' },
  { value: 'Hoch', label: 'Hoch' }
];

const createEmptyTicketForm = () => ({
  title: '',
  description: '',
  type: 'Task',
  priority: '',
  status: 'TODO',
  assigneeUsername: ''
});

export default function BoardDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const authHeaders = { Authorization: `Bearer ${token}` };
  const [boardTitle, setBoardTitle] = useState(() => localStorage.getItem(`board_title_${id}`) || `Board ${id}`);

  // Fallback-Spalten, falls für das Board noch keine Spalten lokal bekannt sind.
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem(`board_cols_${id}`);
    return saved ? JSON.parse(saved) : [
      { value: 'TODO', label: 'Zu tun' },
      { value: 'IN_PROGRESS', label: 'In Arbeit' },
      { value: 'IN_TEST', label: 'In Test' },
      { value: 'DONE', label: 'Erledigt' }
    ];
  });

  const [tickets, setTickets] = useState([]);
  const [boardMembers, setBoardMembers] = useState([]);
  const [ticketForm, setTicketForm] = useState(createEmptyTicketForm());
  const [ticketModalMode, setTicketModalMode] = useState('create');
  const [activeTicket, setActiveTicket] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  // State für das Inline-Editieren von Spaltennamen
  const [editingColumnValue, setEditingColumnValue] = useState(null);
  const [editingColumnLabel, setEditingColumnLabel] = useState('');

  // Drag & Drop States für Tickets
  const [draggedTicketId, setDraggedTicketId] = useState(null);
  const [activeDropStatus, setActiveDropStatus] = useState('');
  const [dropTarget, setDropTarget] = useState(null);

  // Drag & Drop States für Spalten
  const [draggedColumnValue, setDraggedColumnValue] = useState(null);
  const [columnDropTargetValue, setColumnDropTargetValue] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const draggedTicketRef = useRef(null);
  const draggedColumnRef = useRef(null);
  const ignoreNextTicketClickRef = useRef(false);

  // Bei den anderen useState Zeilen
  const [comments, setComments] = useState([]); // Liste für Kommentare
  const [newComment, setNewComment] = useState(''); // Text für neues Kommentar
  const [commentText, setCommentText] = useState('');

  // Backup im LocalStorage zur schnellen UI-Reaktion
  useEffect(() => {
    localStorage.setItem(`board_cols_${id}`, JSON.stringify(columns));
  }, [columns, id]);

  useEffect(() => {
    localStorage.setItem('lastBoardId', id);
    fetchTickets();
    fetchBoardMembers();
    fetchBoardTitle();
  }, [id]);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const fetchedTickets = await loadTickets(id, token);
      setTickets(fetchedTickets);
      if (fetchedTickets[0]?.boardTitle) {
        setBoardTitle(fetchedTickets[0].boardTitle);
        localStorage.setItem(`board_title_${id}`, fetchedTickets[0].boardTitle);
      }

      // Ergänzt Spalten, falls alte Tickets noch Statuswerte enthalten, die lokal nicht bekannt sind.
      setColumns((prevColumns) => {
        const existingValues = prevColumns.map(col => col.value);
        const newCols = [...prevColumns];
        let changed = false;

        fetchedTickets.forEach(ticket => {
          if (ticket.status && !existingValues.includes(ticket.status)) {
            const formattedLabel = ticket.status
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, c => c.toUpperCase());

            newCols.push({ value: ticket.status, label: formattedLabel });
            existingValues.push(ticket.status);
            changed = true;
          }
        });

        return changed ? newCols : prevColumns;
      });

    } catch (err) {
      setError(err.message || 'Tickets konnten nicht geladen werden.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoardMembers = async () => {
    try { setBoardMembers(await loadBoardMembers(id, token)); } catch (e) { setBoardMembers([]); }
  };

  const fetchBoardTitle = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/boards', { headers: authHeaders });
      if (!response.ok) return;

      const boards = await response.json();
      const currentBoard = boards.find((board) => String(board.id) === String(id));
      if (!currentBoard?.title) return;

      setBoardTitle(currentBoard.title);
      localStorage.setItem(`board_title_${id}`, currentBoard.title);
    } catch (error) {
      // Der Titel aus localStorage oder der ID-Fallback reicht, falls die Boardliste nicht geladen werden kann.
    }
  };

  const getTicketsByStatus = (statusValue) => {
    return tickets
      .filter((ticket) => String(ticket.status) === String(statusValue))
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  };

  const getMemberUsername = (member) => member.user?.username || member.username || '';
  const getTicketAssigneeValue = (ticket) => ticket.assignee?.username || ticket.assigneeUsername || '';
  const getTicketAssigneeLabel = (ticket) => getTicketAssigneeValue(ticket) || 'nicht zugewiesen';
  const normalizeTicketType = (type) => type === 'Aufgabe' ? 'Task' : (type || 'Task');

  // NEUE SPALTE IN DB ANLEGEN
  const handleAddColumn = async (e) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    const valueKey = newColumnName.trim().toUpperCase().replace(/\s+/g, '_');

    if (columns.some(col => col.value === valueKey)) {
      alert('Diese Spalte existiert bereits!');
      return;
    }

    setIsSaving(true);
    try {
      await createColumnApi(id, { value: valueKey, label: newColumnName.trim() }, token);
      setColumns([...columns, { value: valueKey, label: newColumnName.trim() }]);
      setNewColumnName('');
      setIsColumnModalOpen(false);
    } catch (err) {
      setError(err.message || 'Spalte konnte in der DB nicht angelegt werden.');
    } finally {
      setIsSaving(false);
    }
  };

  // SPALTENNAME IN DB UPDAETEN
  const handleRenameColumn = async (statusValue) => {
    const trimmedLabel = editingColumnLabel.trim();
    if (!trimmedLabel) {
      setEditingColumnValue(null);
      return;
    }

    const oldColumn = columns.find(col => col.value === statusValue);
    if (oldColumn && oldColumn.label === trimmedLabel) {
      setEditingColumnValue(null);
      return;
    }

    setIsSaving(true);
    try {
      await updateColumnApi(id, statusValue, { label: trimmedLabel }, token);
      setColumns(columns.map(col =>
        col.value === statusValue ? { ...col, label: trimmedLabel } : col
      ));
    } catch (err) {
      setError(err.message || 'Namensänderung konnte nicht in der DB gespeichert werden.');
    } finally {
      setEditingColumnValue(null);
      setIsSaving(false);
    }
  };

  // SPALTE AUS DB LÖSCHEN
  const handleDeleteColumn = async (statusValue, statusLabel) => {
    if (statusValue === 'TODO') {
      alert("Die Standard-Spalte 'Zu tun' darf nicht gelöscht werden!");
      return;
    }

    const confirmDelete = window.confirm(
      `Möchtest du die Spalte "${statusLabel}" wirklich löschen?\nAlle darin enthaltenen Tickets werden automatisch nach "Zu tun" verschoben.`
    );
    if (!confirmDelete) return;

    setIsSaving(true);
    try {
      await deleteColumn(id, statusValue, token);
      setColumns(columns.filter(col => col.value !== statusValue));
      await fetchTickets();
    } catch (err) {
      setError(err.message || 'Spalte konnte nicht gelöscht werden.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // DRAG & DROP FÜR SPALTEN
  // ==========================================
  const handleColumnDragStart = (event, colValue) => {
    if (isSaving || editingColumnValue) return;
    draggedColumnRef.current = colValue;
    setDraggedColumnValue(colValue);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/column-value', colValue);
  };

  const handleColumnHeaderDragOver = (event, targetColValue) => {
    if (!draggedColumnRef.current || draggedColumnRef.current === targetColValue) return;
    event.preventDefault();
    event.stopPropagation();
    setColumnDropTargetValue(targetColValue);
  };

  const handleColumnHeaderDrop = (event, targetColValue) => {
    event.preventDefault();
    event.stopPropagation();

    const sourceValue = draggedColumnRef.current || event.dataTransfer.getData('text/column-value');

    setDraggedColumnValue(null);
    setColumnDropTargetValue(null);
    draggedColumnRef.current = null;

    if (!sourceValue || sourceValue === targetColValue) return;

    setColumns((prevColumns) => {
      const sourceIndex = prevColumns.findIndex(c => c.value === sourceValue);
      const targetIndex = prevColumns.findIndex(c => c.value === targetColValue);

      if (sourceIndex === -1 || targetIndex === -1) return prevColumns;

      const updatedCols = [...prevColumns];
      const [removed] = updatedCols.splice(sourceIndex, 1);
      updatedCols.splice(targetIndex, 0, removed);
      return updatedCols;
    });
  };

  const handleColumnDragEnd = () => {
    setDraggedColumnValue(null);
    setColumnDropTargetValue(null);
    draggedColumnRef.current = null;
  };

  // ==========================================
  // DRAG & DROP FÜR TICKETS
  // ==========================================
  const handleTicketDragStart = (event, ticket) => {
    if (isSaving || draggedColumnRef.current) return;
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
    window.setTimeout(() => { ignoreNextTicketClickRef.current = false; }, 150);
  };

  const handleColumnDragOver = (event, status) => {
    if (!draggedTicketRef.current || isSaving) return;
    event.preventDefault();
    setActiveDropStatus(status);
    if (!event.target.closest?.('.ticket-card')) setDropTarget(null);
  };

  const handleColumnDragLeave = (event, status) => {
    if (activeDropStatus === status && !event.currentTarget.contains(event.relatedTarget)) {
      setActiveDropStatus('');
    }
  };

  const handleColumnDrop = (event, status) => {
    if (draggedColumnRef.current) return;
    event.preventDefault();
    const draggedTicket = draggedTicketRef.current || tickets.find((t) => String(t.id) === event.dataTransfer.getData('text/plain'));
    handleTicketDragEnd();

    if (!draggedTicket || isSaving) return;
    const targetOrderIndex = calculateDropOrderIndex(status, draggedTicket.id);
    handleMoveTicket(draggedTicket, status, targetOrderIndex);
  };

  const handleTicketDragOver = (event, status, ticket) => {
    if (!draggedTicketRef.current || isSaving || draggedTicketRef.current.id === ticket.id) return;
    event.preventDefault();
    const cardBounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < cardBounds.top + cardBounds.height / 2 ? 'before' : 'after';
    setActiveDropStatus(status);
    setDropTarget({ ticketId: ticket.id, status, position });
  };

  const calculateDropOrderIndex = (status, draggedTicketIdValue) => {
    const targetTickets = getTicketsByStatus(status).filter((t) => t.id !== draggedTicketIdValue);
    if (!dropTarget || dropTarget.status !== status) return targetTickets.length;
    const targetTicketIndex = targetTickets.findIndex((t) => t.id === dropTarget.ticketId);
    if (targetTicketIndex === -1) return targetTickets.length;
    return dropTarget.position === 'after' ? targetTicketIndex + 1 : targetTicketIndex;
  };

  const openCreateModal = () => {
    setTicketModalMode('create');
    setActiveTicket(null);
    setTicketForm({ ...createEmptyTicketForm(), status: columns[0]?.value || 'TODO' });
    setIsTicketModalOpen(true);
  };

  const openEditModal = (ticket) => {
    setTicketModalMode('edit');
    setActiveTicket(ticket);
    setTicketForm({
      title: ticket.title || '',
      description: ticket.description || '',
      type: normalizeTicketType(ticket.type),
      priority: ticket.priority || '',
      status: ticket.status || 'TODO',
      assigneeUsername: getTicketAssigneeValue(ticket)
    });
    setIsTicketModalOpen(true);
  };

  const closeTicketModal = () => {
    setIsTicketModalOpen(false);
    setActiveTicket(null);
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    const payload = {
      title: ticketForm.title,
      description: ticketForm.description,
      type: normalizeTicketType(ticketForm.type),
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

  const handleDeleteTicket = async () => {
    if (!activeTicket) return;

    const confirmDelete = window.confirm(`Möchtest du das Ticket "${activeTicket.title}" wirklich unwiderruflich löschen?`);
    if (!confirmDelete) return;

    setIsSaving(true);
    setError('');
    try {
      await deleteTicket(activeTicket.id, token);
      closeTicketModal();
      await fetchTickets();
    } catch (err) {
      setError(err.message || 'Fehler beim Löschen des Tickets.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    setIsSaving(true);
    try {
      // 1. API Aufruf
      const newComment = await createComment(activeTicket.id, { text: commentText }, token);

      // 2. SOFORTIGE Aktualisierung des UI (ohne komplettes fetchTickets)
      setActiveTicket(prev => ({
        ...prev,
        comments: [...(prev.comments || []), newComment]
      }));

      // 3. Input leeren
      setCommentText('');
    } catch (err) {
      alert("Kommentar konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteCommentApi(commentId, token);

      // Lokales State-Update: Entferne den Kommentar aus der Liste
      setActiveTicket(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId)
      }));
    } catch (err) {
      alert("Konnte Kommentar nicht löschen: " + err.message);
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

  return (
    <AppLayout>
      <div className="board-detail-page">

        {/* HEADER AREA */}
        <div className="board-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1>{boardTitle}</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Klicke auf Spaltennamen zum Umbenennen. Änderungen fließen direkt in die DB.</p>
          </div>
          <div className="board-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>

            {/* BUTTON ZUR STATSDASHBOARD SEITE */}
            <button
              className="icon-btn"
              onClick={() => navigate(`/board/${id}/analysis`)}
              style={{
                backgroundColor: 'var(--primary-soft)',
                border: '1px solid var(--primary)',
                color: 'var(--primary)',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--primary)';
                e.target.style.color = 'var(--text-strong)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--primary-soft)';
                e.target.style.color = 'var(--primary)';
              }}
            >
              Board Analyse anzeigen
            </button>

            <button className="icon-btn" onClick={() => setIsColumnModalOpen(true)}>
              + Spalte hinzufügen
            </button>
            <button className="icon-btn" onClick={fetchTickets} disabled={isLoading || isSaving}>
              ↻ Aktualisieren
            </button>
            <button className="btn-primary" style={{ width: 'auto' }} onClick={openCreateModal} disabled={isSaving}>
              + Neues Ticket
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {isLoading ? (
          <div className="empty-state" style={{ fontSize: '1.2rem', padding: '40px' }}>Daten werden geladen...</div>
        ) : (
          <div className="ticket-columns" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, minmax(280px, 1fr))`,
            gap: '20px',
            alignItems: 'start',
            padding: '10px 0'
          }}>
            {columns.map((status) => {
              const columnTickets = getTicketsByStatus(status.value);

              const isColumnDragging = draggedColumnValue === status.value;
              const isColumnDropTarget = columnDropTargetValue === status.value;
              const isEditing = editingColumnValue === status.value;

              return (
                <section
                  className={[
                    'ticket-column',
                    activeDropStatus === status.value ? 'drop-active' : '',
                    isColumnDragging ? 'column-dragging' : '',
                    isColumnDropTarget ? 'column-drop-target' : ''
                  ].filter(Boolean).join(' ')}
                  key={status.value}
                  onDragOver={(event) => handleColumnDragOver(event, status.value)}
                  onDragLeave={(event) => handleColumnDragLeave(event, status.value)}
                  onDrop={(event) => handleColumnDrop(event, status.value)}
                  style={{
                    opacity: isColumnDragging ? 0.4 : 1,
                    border: isColumnDropTarget ? '2px dashed var(--primary)' : 'none',
                    backgroundColor: 'var(--surface-elevated)',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: 'var(--shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: '500px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* SPALTEN HEADER */}
                  <div
                    className="ticket-column-header"
                    draggable={!isSaving && !isEditing}
                    onDragStart={(event) => handleColumnDragStart(event, status.value)}
                    onDragEnd={handleColumnDragEnd}
                    onDragOver={(event) => handleColumnHeaderDragOver(event, status.value)}
                    onDrop={(event) => handleColumnHeaderDrop(event, status.value)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'var(--surface-soft)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      borderBottom: '2px solid var(--border-soft)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', cursor: 'grab', userSelect: 'none' }} title="Spalte verschieben">⋮⋮</span>

                      {isEditing ? (
                        <input
                          type="text"
                          value={editingColumnLabel}
                          onChange={(e) => setEditingColumnLabel(e.target.value)}
                          onBlur={() => handleRenameColumn(status.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameColumn(status.value);
                            if (e.key === 'Escape') setEditingColumnValue(null);
                          }}
                          autoFocus
                          disabled={isSaving}
                          style={{
                            background: 'var(--surface-deep)',
                            border: '1px solid var(--primary)',
                            borderRadius: '4px',
                            color: 'var(--text-strong)',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            padding: '2px 6px',
                            width: '80%',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <h4
                          onClick={() => {
                            if(!isSaving) {
                              setEditingColumnValue(status.value);
                              setEditingColumnLabel(status.label);
                            }
                          }}
                          style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            color: 'var(--text-strong)',
                            letterSpacing: '0.5px',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                          title="Klicken zum Umbenennen"
                        >
                          {status.label}
                        </h4>
                      )}

                      <span style={{
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--text-muted)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {columnTickets.length}
                      </span>
                    </div>

                    {status.value !== 'TODO' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteColumn(status.value, status.label); }}
                        disabled={isSaving}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '4px', opacity: 0.7, flexShrink: 0 }}
                        title="Spalte löschen"
                        onMouseEnter={(e) => !isSaving && (e.target.style.opacity = 1)}
                        onMouseLeave={(e) => !isSaving && (e.target.style.opacity = 0.7)}
                      >
                        x
                      </button>
                    )}
                  </div>

                  {columnTickets.length === 0 && (
                    <div style={{
                      border: '2px dashed var(--border-soft)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem'
                    }}>
                      Keine Tickets
                    </div>
                  )}

                  {/* TICKET KACHELN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {columnTickets.map((ticket) => {
                      const typeColors = {
                        'Bug': { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
                        'Feature': { bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
                        'Task': { bg: '#f0fdf4', text: '#166534', border: '#86efac' }
                      };
                      const ticketType = normalizeTicketType(ticket.type);
                      const currentType = typeColors[ticketType] || typeColors['Task'];

                      const priorityColors = {
                        'Hoch': { color: '#ef4444', label: '▲ Hoch' },
                        'Mittel': { color: '#eab308', label: '■ Mittel' },
                        'Niedrig': { color: '#3b82f6', label: '▼ Niedrig' }
                      };
                      const currentPriority = priorityColors[ticket.priority];

                      return (
                        <div
                          className={[
                            'ticket-card',
                            draggedTicketId === ticket.id ? 'dragging' : '',
                            dropTarget?.ticketId === ticket.id && dropTarget.position === 'before' ? 'drop-before' : '',
                            dropTarget?.ticketId === ticket.id && dropTarget.position === 'after' ? 'drop-after' : ''
                          ].filter(Boolean).join(' ')}
                          key={ticket.id}
                          draggable={!isSaving}
                          onClick={() => { if (!ignoreNextTicketClickRef.current) openEditModal(ticket); }}
                          onDragStart={(event) => handleTicketDragStart(event, ticket)}
                          onDragOver={(event) => handleTicketDragOver(event, status.value, ticket)}
                          style={{
                            backgroundColor: 'var(--surface-deep)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '10px',
                            padding: '14px',
                            cursor: 'grab',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: 'var(--shadow)',
                            opacity: draggedTicketId === ticket.id ? 0.3 : 1,
                            transform: draggedTicketId === ticket.id ? 'scale(0.98)' : 'none',
                            transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.boxShadow = 'var(--shadow)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-soft)';
                            e.currentTarget.style.boxShadow = 'var(--shadow)';
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                            <span style={{
                              backgroundColor: currentType.bg,
                              color: currentType.text,
                              border: `1px solid ${currentType.border}`,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.3px'
                            }}>
                              {ticketType}
                            </span>

                            {currentPriority && (
                              <span style={{ color: currentPriority.color, fontSize: '0.75rem', fontWeight: '600' }}>
                                {currentPriority.label}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{
                              color: 'var(--text-strong)',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              lineHeight: '1.4'
                            }}>
                              {ticket.title}
                            </strong>

                            {ticket.description && (
                              <p style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.8rem',
                                margin: 0,
                                lineHeight: '1.4',
                                display: '-webkit-box',
                                WebkitLineClamp: '2',
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {ticket.description}
                              </p>
                            )}
                          </div>

                          <div style={{
                            borderTop: '1px solid var(--border-soft)',
                            paddingTop: '8px',
                            marginTop: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                              <span>👤</span>
                              <span style={{
                                color: getTicketAssigneeValue(ticket) ? 'var(--text-soft)' : 'var(--text-muted)',
                                fontWeight: getTicketAssigneeValue(ticket) ? '500' : 'normal'
                              }}>
                                {getTicketAssigneeLabel(ticket)}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', userSelect: 'none' }}>⋮⋮</span>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: NEUE SPALTE ERSTELLEN */}
      {isColumnModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{ backgroundColor: 'var(--surface-elevated)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px', color: 'var(--text-strong)' }}>
            <h3 style={{ marginTop: 0 }}>Neue Status-Spalte hinzufügen</h3>
            <form onSubmit={handleAddColumn} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Name der Spalte</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="z.B. Im Review, Blockiert..."
                  required
                  style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text-strong)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--primary)', color: 'var(--text-strong)', border: 'none', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer' }} disabled={isSaving}>
                  {isSaving ? 'Speichert...' : 'Spalte hinzufügen'}
                </button>
                <button type="button" onClick={() => setIsColumnModalOpen(false)} className="btn-secondary" style={{ backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 16px', cursor: 'pointer' }} disabled={isSaving}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '550px',
            boxShadow: 'var(--shadow-strong)', color: 'var(--text-strong)',
            maxHeight: '90vh', overflowY: 'auto', position: 'relative'
          }}>
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
                {ticketModalMode === 'create' ? '+ Neues Ticket erstellen' : 'Ticket bearbeiten'}
              </h3>
              <button onClick={closeTicketModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* FORMULAR */}
            <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Titel</label>
                <input type="text" value={ticketForm.title} onChange={(e) => setTicketForm({...ticketForm, title: e.target.value})} required style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text-strong)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Beschreibung</label>
                <textarea rows="3" value={ticketForm.description || ''} onChange={(e) => setTicketForm({...ticketForm, description: e.target.value})} style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text-strong)' }} />
              </div>

              {/* DETAILS: Status, Priorität, Zuweisung (Dropdowns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Typ */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Typ</label>
                  <select value={ticketForm.type || 'Task'} onChange={(e) => setTicketForm({...ticketForm, type: e.target.value})} style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-strong)' }}>
                    {TICKET_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</label>
                  <select value={ticketForm.status} onChange={(e) => setTicketForm({...ticketForm, status: e.target.value})} style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-strong)' }}>
                    {columns.map((column) => (
                      <option key={column.value} value={column.value}>{column.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priorität Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Priorität</label>
                  <select value={ticketForm.priority || ''} onChange={(e) => setTicketForm({...ticketForm, priority: e.target.value})} style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-strong)' }}>
                    <option value="">Keine</option>
                    <option value="Niedrig">Niedrig</option>
                    <option value="Mittel">Mittel</option>
                    <option value="Hoch">Hoch</option>
                  </select>
                </div>

                {/* Zuweisung Dropdown (Hier muss deine Liste der Board-Mitglieder rein) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Zuweisung</label>
                  <select value={ticketForm.assigneeUsername || ''} onChange={(e) => setTicketForm({...ticketForm, assigneeUsername: e.target.value})} style={{ backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px', color: 'var(--text-strong)' }}>
                    <option value="">Nicht zugewiesen</option>
                    {boardMembers?.map(member => (
                      <option key={member.user.username} value={member.user.username}>{member.user.username}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <button type="submit" style={{ backgroundColor: 'var(--primary)', color: 'var(--text-strong)', border: 'none', borderRadius: '6px', padding: '10px 20px', cursor: 'pointer', width: '100%' }}>Speichern</button>
              </div>
            </form>

            {/* KOMMENTAR-SEKTION */}
            {ticketModalMode === 'edit' && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', marginBottom: '12px' }}>Diskussion</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                  {activeTicket?.comments?.length > 0 ? activeTicket.comments.map((c, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--surface-deep)', padding: '10px 14px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--primary)' }}>{c.author}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>{c.text}</p>
                    </div>
                  )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Noch keine Kommentare.</p>}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Schreibe einen Kommentar..." style={{ flex: 1, backgroundColor: 'var(--surface-deep)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', color: 'var(--text-strong)' }} />
                  <button onClick={handleAddComment} disabled={isSaving} style={{ backgroundColor: 'var(--primary)', color: 'var(--text-strong)', border: 'none', borderRadius: '8px', padding: '0 16px', cursor: 'pointer' }}>Senden</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

