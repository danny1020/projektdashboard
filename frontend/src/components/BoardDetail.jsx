import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from './AppLayout';
import {
  createTicket,
  loadBoardMembers,
  loadTickets,
  moveTicket,
  updateTicket,
  deleteColumn,
  createColumnApi,
  updateColumnApi
} from '../services/ticketApi';

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

  // Initialer State mit Standard-Fallbacks (wird direkt im Anschluss durch DB-Daten ersetzt)
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

  // Backup im LocalStorage zur schnellen UI-Reaktion
  useEffect(() => {
    localStorage.setItem(`board_cols_${id}`, JSON.stringify(columns));
  }, [columns, id]);

  useEffect(() => {
    localStorage.setItem('lastBoardId', id);
    fetchTickets();
    fetchBoardMembers();
  }, [id]);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError('');
    try {
      const fetchedTickets = await loadTickets(id, token);
      setTickets(fetchedTickets);

      // AUTOMATISCHE SPALTENERKENNUNG AUS DER DB (Falls Tickets neue Statuswerte besitzen)
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

  const getTicketsByStatus = (statusValue) => {
    return tickets
      .filter((ticket) => String(ticket.status) === String(statusValue))
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  };

  const getMemberUsername = (member) => member.user?.username || member.username || '';
  const getTicketAssigneeValue = (ticket) => ticket.assignee?.username || ticket.assigneeUsername || '';
  const getTicketAssigneeLabel = (ticket) => getTicketAssigneeValue(ticket) || 'nicht zugewiesen';

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
      // Sendet Daten an den Spring Controller (@PostMapping)
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
      // Sendet Daten an den Spring Controller (@PutMapping("/{statusValue}"))
      await updateColumnApi(id, statusValue, { label: trimmedLabel }, token);

      // UI aktualisieren
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

  // SPALTE AUS DB LÖSCHEN (Erste Spalte 'TODO' bleibt blockiert)
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
      // Ruft @DeleteMapping("/{statusValue}") auf
      await deleteColumn(id, statusValue, token);
      setColumns(columns.filter(col => col.value !== statusValue));
      await fetchTickets(); // Tickets neu laden (wurden serverseitig verschoben)
    } catch (err) {
      setError(err.message || 'Spalte konnte nicht gelöscht werden.');
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // DRAG & DROP FÜR SPALTEN (CLIENT-ONLY SORTIERUNG)
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

  return (
    <AppLayout>
      <div className="board-detail-page">

        <div className="board-detail-header">
          <div>
            <h1>Board (ID: {id})</h1>
            <p style={{ color: '#9ca3af', margin: 0 }}>Klicke auf Spaltennamen zum Umbenennen. Änderungen fließen direkt in die DB.</p>
          </div>
          <div className="board-header-actions">
            <button className="icon-btn" onClick={() => setIsColumnModalOpen(true)}>
              ➕ Spalte hinzufügen
            </button>
            <button className="icon-btn" onClick={fetchTickets} disabled={isLoading || isSaving}>
              🔄 Aktualisieren
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
                    border: isColumnDropTarget ? '2px dashed #6366f1' : 'none',
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      <span style={{ color: '#64748b', fontSize: '1.1rem', cursor: 'grab', userSelect: 'none' }} title="Spalte verschieben">⋮⋮</span>

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
                            background: '#0f172a',
                            border: '1px solid #6366f1',
                            borderRadius: '4px',
                            color: '#f8fafc',
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
                            color: '#f8fafc',
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
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        color: '#94a3b8',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {columnTickets.length}
                      </span>
                    </div>

                    {/* Erste Spalte (TODO) bleibt unlöschbar */}
                    {status.value !== 'TODO' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteColumn(status.value, status.label); }}
                        disabled={isSaving}
                        style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', padding: '4px', opacity: 0.7, flexShrink: 0 }}
                        title="Spalte löschen"
                        onMouseEnter={(e) => !isSaving && (e.target.style.opacity = 1)}
                        onMouseLeave={(e) => !isSaving && (e.target.style.opacity = 0.7)}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {columnTickets.length === 0 && (
                    <div style={{
                      border: '2px dashed rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      color: '#64748b',
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
                        'Aufgabe': { bg: '#f0fdf4', text: '#166534', border: '#86efac' }
                      };
                      const currentType = typeColors[ticket.type] || typeColors['Aufgabe'];

                      const priorityColors = {
                        'Hoch': { color: '#ef4444', label: '▲ Hoch' },
                        'Mittel': { color: '#eab308', label: '■ Mittel' },
                        'Niedrig': { color: '#3b82f6', label: '▼ Niedrig' }
                      };
                      const currentPriority = priorityColors[ticket.priority];

                      return (
                        <div
                          className={[
                            ticket.status === 'DONE' ? 'ticket-card done' : 'ticket-card',
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
                            backgroundColor: '#0f172a',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '10px',
                            padding: '14px',
                            cursor: 'grab',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                            opacity: draggedTicketId === ticket.id ? 0.3 : (ticket.status === 'DONE' ? 0.6 : 1),
                            transform: draggedTicketId === ticket.id ? 'scale(0.98)' : 'none',
                            transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
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
                              {ticket.type || 'Aufgabe'}
                            </span>

                            {currentPriority && (
                              <span style={{ color: currentPriority.color, fontSize: '0.75rem', fontWeight: '600' }}>
                                {currentPriority.label}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{
                              color: '#f8fafc',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              lineHeight: '1.4',
                              textDecoration: ticket.status === 'DONE' ? 'line-through' : 'none'
                            }}>
                              {ticket.title}
                            </strong>

                            {ticket.description && (
                              <p style={{
                                color: '#94a3b8',
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
                            borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                            paddingTop: '8px',
                            marginTop: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.75rem' }}>
                              <span>👤</span>
                              <span style={{
                                color: getTicketAssigneeValue(ticket) ? '#cbd5e1' : '#64748b',
                                fontWeight: getTicketAssigneeValue(ticket) ? '500' : 'normal'
                              }}>
                                {getTicketAssigneeLabel(ticket)}
                              </span>
                            </div>
                            <span style={{ color: '#475569', fontSize: '0.8rem', userSelect: 'none' }}>⋮⋮</span>
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
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Neue Status-Spalte hinzufügen</h3>
            <form onSubmit={handleAddColumn}>
              <div className="input-group">
                <label>Name der Spalte</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="z.B. Im Review, Blockiert..."
                  required
                />
              </div>
              <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Speichert...' : 'Spalte hinzufügen'}</button>
              <button type="button" onClick={() => setIsColumnModalOpen(false)} className="btn-secondary" disabled={isSaving}>Abbrechen</button>
            </form>
          </div>
        </div>
      )}

      {/* TICKET MODAL */}
      {isTicketModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <h3>{ticketModalMode === 'create' ? 'Neues Ticket' : 'Ticket bearbeiten'}</h3>
            <form onSubmit={handleTicketSubmit}>
              <div className="input-group">
                <label>Titel</label>
                <input type="text" value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} required />
              </div>
              <div className="input-group">
                <label>Beschreibung</label>
                <textarea rows="3" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Typ</label>
                  <select value={ticketForm.type} onChange={(e) => setTicketForm({ ...ticketForm, type: e.target.value })}>{TICKET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                </div>
                <div className="input-group">
                  <label>Priorität</label>
                  <select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}>{TICKET_PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="input-group">
                  <label>Status (Spalte)</label>
                  <select value={ticketForm.status} onChange={(e) => setTicketForm({ ...ticketForm, status: e.target.value })}>
                    {columns.map((col) => (
                      <option key={col.value} value={col.value}>{col.label}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Zugewiesen an</label>
                  <select value={ticketForm.assigneeUsername} onChange={(e) => setTicketForm({ ...ticketForm, assigneeUsername: e.target.value })}>
                    <option value="">nicht zugewiesen</option>
                    {boardMembers.map((m) => { const u = getMemberUsername(m); return u && <option key={u} value={u}>{u}</option>; })}
                  </select>
                </div>
              </div>

              <div style={{ marginTop: '25px' }}>
                <button type="submit" className="btn-primary" disabled={isSaving}>{isSaving ? 'Speichert...' : 'Speichern'}</button>
                <button type="button" onClick={closeTicketModal} className="btn-secondary">Abbrechen</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
