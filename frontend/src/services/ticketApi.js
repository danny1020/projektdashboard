const API_BASE_URL = 'http://localhost:8080/api'; // Passe den Port an dein Spring Boot an

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

async function readErrorMessage(response, fallbackMessage) {
  const text = await response.text();
  if (!text) return fallbackMessage;

  try {
    const errorData = JSON.parse(text);
    return errorData.message || errorData.error || text;
  } catch (error) {
    return text;
  }
}

// ==========================================
// TICKETS API
// ==========================================

/**
 * Lädt alle Tickets für ein bestimmtes Board via Query-Parameter.
 * Entspricht im Controller: @GetMapping -> /api/tickets?boardId=2
 */
export async function loadTickets(boardId, token) {
  const response = await fetch(`${API_BASE_URL}/tickets?boardId=${boardId}`, {
    method: 'GET',
    headers: getHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Tickets konnten nicht geladen werden.'));
  }
  return response.json();
}

/**
 * Erstellt ein neues Ticket.
 * Entspricht im Controller: @PostMapping -> /api/tickets
 */
export async function createTicket(ticketData, token) {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(ticketData)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Ticket konnte nicht erstellt werden.'));
  }
  return response.json();
}

/**
 * Aktualisiert die Details eines bestehenden Tickets (Benutzt PATCH wie im Controller definiert).
 * Entspricht im Controller: @PatchMapping("/{id}") -> /api/tickets/{id}
 */
export async function updateTicket(ticketId, ticketData, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(ticketData)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Ticket konnte nicht aktualisiert werden.'));
  }
  return response.json();
}

/**
 * Verschiebt ein Ticket via Drag & Drop (Benutzt PATCH statt PUT).
 * Entspricht im Controller: @PatchMapping("/{id}/move") -> /api/tickets/{id}/move
 */
export async function moveTicket(ticketId, moveData, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/move`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(moveData) // Schickt { status: "IN_PROGRESS", orderIndex: 2 }
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Ticket konnte nicht verschoben werden.'));
  }
  return response.json();
}

// ==========================================
// BOARD MEMBERS API
// ==========================================

/**
 * Lädt alle zugelassenen Mitglieder eines Boards.
 * (Falls du hierfür einen separaten Controller hast, bleibt die Route so)
 */
export async function loadBoardMembers(boardId, token) {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}/members`, {
    method: 'GET',
    headers: getHeaders(token)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Board-Mitglieder konnten nicht geladen werden.');
  }
  return response.json();
}

// ==========================================
// DYNAMISCHE SPALTEN (COLUMNS) API
// ==========================================

/**
 * Erstellt eine neue Status-Spalte auf dem Board.
 */
export async function createColumnApi(boardId, columnData, token) {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(columnData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Spalte konnte nicht erstellt werden.');
  }
  return response.json();
}

/**
 * Benennt ein bestehendes Spalten-Label inline um.
 */
export async function updateColumnApi(boardId, statusValue, data, token) {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns/${statusValue}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Spaltenname konnte nicht geändert werden.');
  }
  return response.json();
}

/**
 * Löscht eine Spalte und nutzt Query-Parameter wie im Controller gefordert.
 * Entspricht im Controller: @DeleteMapping("/columns") -> /api/tickets/columns?boardId=2&status=REVIEW
 */
export async function deleteColumn(boardId, statusValue, token) {
  const response = await fetch(`${API_BASE_URL}/boards/${boardId}/columns/${statusValue}`, {
    method: 'DELETE',
    headers: getHeaders(token)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Spalte konnte nicht gelöscht werden.');
  }
  return response.json();
}


/**
 * Löscht ein Ticket vollständig aus der Datenbank.
 * Entspricht im Controller: @DeleteMapping("/{id}") -> /api/tickets/{id}
 */
export async function deleteTicket(ticketId, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Ticket konnte nicht gelöscht werden.');
  }
  return true;
}

/**
 * Lädt die Live-Kennzahlen für das Dashboard eines bestimmten Boards.
 * Entspricht im Controller: @GetMapping("/stats") -> /api/tickets/stats?boardId=2
 */
// Ändere dies in deiner ticketApi.js
export async function loadBoardStats(boardId, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/stats/${boardId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    // Hier geben wir den echten Statuscode zurück
    const errorBody = await response.text();
    throw new Error(`Server antwortete mit ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function createComment(ticketId, commentData, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/comments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commentData)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Fehler beim Speichern des Kommentars');
  }
  return response.json();
}

export async function deleteCommentApi(commentId, token) {
  const response = await fetch(`${API_BASE_URL}/tickets/comments/${commentId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) throw new Error('Fehler beim Löschen des Kommentars');
  return true;
}
