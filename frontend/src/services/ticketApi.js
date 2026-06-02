const API_URL = 'http://localhost:8080/api';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`
});

const readErrorMessage = async (res) => {
  const text = await res.text();
  if (!text) return `HTTP ${res.status}: ${res.statusText || 'Unbekannter Fehler'}`;

  try {
    const data = JSON.parse(text);
    return data.message || data.error || text;
  } catch (e) {
    return text;
  }
};

const request = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, options);

  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  return res.json();
};

export const loadTickets = (boardId, token) => {
  return request(`/tickets?boardId=${encodeURIComponent(boardId)}`, {
    headers: getHeaders(token)
  });
};

export const loadBoardMembers = (boardId, token) => {
  return request(`/boards/${encodeURIComponent(boardId)}/members`, {
    headers: getHeaders(token)
  });
};

export const createTicket = (ticket, token) => {
  return request('/tickets', {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(ticket)
  });
};

export const updateTicket = (ticketId, changes, token) => {
  return request(`/tickets/${ticketId}`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(changes)
  });
};

export const moveTicket = (ticketId, move, token) => {
  return request(`/tickets/${ticketId}/move`, {
    method: 'PATCH',
    headers: getHeaders(token),
    body: JSON.stringify(move)
  });
};
