package de.fom.projektdashboard.controller;

import de.fom.projektdashboard.dto.TicketPatchRequest;
import de.fom.projektdashboard.dto.TicketMoveRequest;
import de.fom.projektdashboard.dto.TicketRequest;
import de.fom.projektdashboard.dto.TicketResponse;
import de.fom.projektdashboard.model.board.Board;
import de.fom.projektdashboard.model.board.BoardMember;
import de.fom.projektdashboard.model.board.BoardRole;
import de.fom.projektdashboard.model.ticket.Comment;
import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.repository.BoardMemberRepository;
import de.fom.projektdashboard.repository.BoardRepository;
import de.fom.projektdashboard.repository.CommentRepository;
import de.fom.projektdashboard.repository.TicketRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final CommentRepository commentRepository;

    public TicketController(TicketRepository ticketRepository, BoardRepository boardRepository,
                            BoardMemberRepository boardMemberRepository, CommentRepository commentRepository) {
        this.ticketRepository = ticketRepository;
        this.boardRepository = boardRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.commentRepository = commentRepository;
    }

    // Lädt Tickets für ein bestimmtes Board oder alle Boards des eingeloggten Users.
    @GetMapping
    public ResponseEntity<?> getTickets(@RequestParam(required = false) Long boardId, Principal principal) {
        List<Ticket> tickets;

        if (boardId != null) {
            Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(boardId, principal.getName());
            if (membership.isEmpty()) {
                return forbidden("Du hast keinen Zugriff auf dieses Board.");
            }
            tickets = ticketRepository.findByBoardIdOrderByStatusAscOrderIndexAscCreatedAtAsc(boardId);
        } else {
            List<Long> boardIds = boardMemberRepository.findByUserUsername(principal.getName()).stream()
                .map(BoardMember::getBoard)
                .map(Board::getId)
                .toList();

            tickets = boardIds.isEmpty()
                ? List.of()
                : ticketRepository.findByBoardIdInOrderByBoardIdAscStatusAscOrderIndexAscCreatedAtAsc(boardIds);
        }

        return ResponseEntity.ok(tickets.stream().map(TicketResponse::from).toList());
    }



    // Erstellt ein neues Ticket in einem Board, wenn der User dort Schreibrechte hat.
    @PostMapping
    @Transactional
    public ResponseEntity<?> createTicket(@Valid @RequestBody TicketRequest request, Principal principal) {
        Board board = boardRepository.findById(request.getBoardId()).orElse(null);
        if (board == null) {
            return notFound("Board wurde nicht gefunden.");
        }

        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(board.getId(), principal.getName());
        if (membership.isEmpty()) {
            return forbidden("Du hast keinen Zugriff auf dieses Board.");
        }
        if (!canWriteTickets(membership.get().getRole())) {
            return forbidden("Du darfst in diesem Board keine Tickets erstellen.");
        }

        Ticket ticket = new Ticket();
        ticket.setBoard(board);
        ticket.setTitle(request.getTitle().trim());
        ticket.setDescription(normalizeText(request.getDescription()));
        ticket.setType(normalizeTicketType(request.getType()));
        ticket.setPriority(normalizeText(request.getPriority()));
        String assigneeUsername = normalizeText(request.getAssigneeUsername());
        if (assigneeUsername != null) {
            Optional<BoardMember> assignee = boardMemberRepository.findByBoardIdAndUserUsername(board.getId(), assigneeUsername);
            if (assignee.isEmpty()) {
                return badRequest("Zugewiesener User ist kein Mitglied dieses Boards.");
            }
            ticket.setAssigneeUsername(assignee.get().getUser().getUsername());
        }

        // Flexibler String-FallBack statt Enum
        ticket.setStatus(request.getStatus() == null ? "TODO" : request.getStatus());
        ticket.setOrderIndex(0);

        Ticket savedTicket = ticketRepository.save(ticket);
        int targetOrderIndex = request.getOrderIndex() == null
            ? ticketRepository.findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(board.getId(), savedTicket.getStatus()).size() - 1
            : request.getOrderIndex().intValue();
        moveTicketTo(savedTicket, savedTicket.getStatus(), targetOrderIndex);

        return ResponseEntity.status(HttpStatus.CREATED).body(TicketResponse.from(savedTicket));
    }

    // Bearbeitet einzelne Ticket-Felder, wenn der User Zugriff und Schreibrechte auf das Board hat.
    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateTicket(@PathVariable Long id, @Valid @RequestBody TicketPatchRequest request,
                                          Principal principal) {
        Ticket ticket = ticketRepository.findById(id).orElse(null);
        if (ticket == null) {
            return notFound("Ticket wurde nicht gefunden.");
        }

        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(ticket.getBoard().getId(), principal.getName());
        if (membership.isEmpty()) {
            return forbidden("Du hast keinen Zugriff auf dieses Ticket.");
        }
        if (!canWriteTickets(membership.get().getRole())) {
            return forbidden("Du darfst dieses Ticket nicht bearbeiten.");
        }

        boolean changed = false;

        if (request.getTitle() != null) {
            String title = request.getTitle().trim();
            if (title.isEmpty()) {
                return badRequest("Titel darf nicht leer sein.");
            }
            ticket.setTitle(title);
            changed = true;
        }

        if (request.getDescription() != null) {
            ticket.setDescription(normalizeText(request.getDescription()));
            changed = true;
        }

        if (request.getType() != null) {
            ticket.setType(normalizeTicketType(request.getType()));
            changed = true;
        }

        if (request.getPriority() != null) {
            ticket.setPriority(normalizeText(request.getPriority()));
            changed = true;
        }

        if (request.getAssigneeUsername() != null) {
            String assigneeUsername = normalizeText(request.getAssigneeUsername());
            if (assigneeUsername == null) {
                ticket.setAssigneeUsername(null);
            } else {
                Optional<BoardMember> assignee = boardMemberRepository.findByBoardIdAndUserUsername(ticket.getBoard().getId(), assigneeUsername);
                if (assignee.isEmpty()) {
                    return badRequest("Zugewiesener User ist kein Mitglied dieses Boards.");
                }
                ticket.setAssigneeUsername(assignee.get().getUser().getUsername());
            }
            changed = true;
        }

        if (request.getStatus() != null || request.getOrderIndex() != null) {
            String targetStatus = request.getStatus() == null ? ticket.getStatus() : request.getStatus();
            int targetOrderIndex = request.getOrderIndex() == null ? currentOrderIndex(ticket) : request.getOrderIndex().intValue();
            moveTicketTo(ticket, targetStatus, targetOrderIndex);
            changed = true;
        }

        if (!changed) {
            return badRequest("Mindestens ein Feld muss zum Bearbeiten angegeben werden.");
        }

        Ticket savedTicket = ticketRepository.save(ticket);
        return ResponseEntity.ok(TicketResponse.from(savedTicket));
    }

    // Verschiebt ein Ticket in eine Statusspalte und speichert die neue Reihenfolge.
    @PatchMapping("/{id}/move")
    @Transactional
    public ResponseEntity<?> moveTicket(@PathVariable Long id, @Valid @RequestBody TicketMoveRequest request,
                                        Principal principal) {
        Ticket ticket = ticketRepository.findById(id).orElse(null);
        if (ticket == null) {
            return notFound("Ticket wurde nicht gefunden.");
        }

        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(ticket.getBoard().getId(), principal.getName());
        if (membership.isEmpty()) {
            return forbidden("Du hast keinen Zugriff auf dieses Ticket.");
        }
        if (!canWriteTickets(membership.get().getRole())) {
            return forbidden("Du darfst dieses Ticket nicht verschieben.");
        }

        moveTicketTo(ticket, request.getStatus(), request.getOrderIndex().intValue());
        return ResponseEntity.ok(TicketResponse.from(ticket));
    }

    // Löscht eine Statusspalte für ein Board und verschiebt verbliebene Tickets nach "TODO"
    @DeleteMapping("/columns")
    @Transactional
    public ResponseEntity<?> deleteColumn(@RequestParam Long boardId, @RequestParam String status, Principal principal) {
        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(boardId, principal.getName());
        if (membership.isEmpty()) {
            return forbidden("Du hast keinen Zugriff auf dieses Board.");
        }
        if (!canWriteTickets(membership.get().getRole())) {
            return forbidden("Du darfst in diesem Board keine Spalten löschen.");
        }

        if ("TODO".equalsIgnoreCase(status)) {
            return badRequest("Die Standard-Spalte 'TODO' kann nicht gelöscht werden.");
        }

        List<Ticket> ticketsInColumn = ticketRepository.findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(boardId, status);

        if (!ticketsInColumn.isEmpty()) {
            List<Ticket> todoTickets = new ArrayList<>(
                ticketRepository.findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(boardId, "TODO")
            );

            for (Ticket ticket : ticketsInColumn) {
                ticket.setStatus("TODO");
                todoTickets.add(ticket);
            }

            reindexTickets(todoTickets);
        }

        return ResponseEntity.ok(Map.of("message", "Spalte erfolgreich gelöscht und Tickets verschoben."));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteTicket(@PathVariable Long id, Principal principal) {
        Ticket ticket = ticketRepository.findById(id).orElse(null);
        if (ticket == null) {
            return notFound("Ticket wurde nicht gefunden.");
        }

        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(
            ticket.getBoard().getId(), principal.getName()
        );
        if (membership.isEmpty()) {
            return forbidden("Du hast keinen Zugriff auf dieses Ticket.");
        }
        if (!canWriteTickets(membership.get().getRole())) {
            return forbidden("Du darfst dieses Ticket nicht löschen.");
        }

        Long boardId = ticket.getBoard().getId();
        String status = ticket.getStatus();
        Long ticketId = ticket.getId();

        ticketRepository.delete(ticket);

        reindexColumnWithoutTicket(boardId, status, ticketId);

        return ResponseEntity.ok(Map.of("message", "Ticket erfolgreich gelöscht."));
    }

    @GetMapping("/stats/{boardId}")
    public ResponseEntity<?> getBoardStats(@PathVariable Long boardId, Principal principal) {
        // 1. Zugriff prüfen
        Optional<BoardMember> membership = boardMemberRepository.findByBoardIdAndUserUsername(boardId, principal.getName());
        if (membership.isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Zugriff verweigert."));
        }

        List<Ticket> tickets = ticketRepository.findByBoardIdOrderByStatusAscOrderIndexAscCreatedAtAsc(boardId);

        Map<String, Long> statusCounts = tickets.stream()
            .collect(Collectors.groupingBy(
                t -> t.getStatus() != null ? t.getStatus() : "UNBEKANNT",
                Collectors.counting()
            ));

        Map<String, Object> response = new HashMap<>();
        response.put("totalTickets", (long) tickets.size());
        response.put("statusCounts", statusCounts);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/board/{boardId}/tickets")
    public List<Ticket> getTickets(@PathVariable Long boardId) {
        return ticketRepository.findByBoardId(boardId);
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long commentId, Principal principal) {
        Comment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new RuntimeException("Kommentar nicht gefunden"));

        if (!comment.getAuthor().equals(principal.getName())) {
            return ResponseEntity.status(403).body("Du darfst nur deine eigenen Kommentare löschen.");
        }

        commentRepository.delete(comment);
        return ResponseEntity.ok().build();
    }

    // Prüft, ob eine Board-Rolle Tickets erstellen und bearbeiten darf.
    private boolean canWriteTickets(BoardRole role) {
        return role == BoardRole.OWNER || role == BoardRole.ADMIN || role == BoardRole.MITARBEITER;
    }

    // Nutzt 0 als Fallback, falls alte Datenbankzeilen noch keinen orderIndex haben.
    private int currentOrderIndex(Ticket ticket) {
        return ticket.getOrderIndex() == null ? 0 : ticket.getOrderIndex();
    }

    // Sortiert ein Ticket in die Zielspalte ein und nummeriert die Spalte neu.
    private void moveTicketTo(Ticket ticket, String targetStatus, int targetOrderIndex) {
        Long boardId = ticket.getBoard().getId();
        String oldStatus = ticket.getStatus();

        if (!oldStatus.equals(targetStatus)) {
            reindexColumnWithoutTicket(boardId, oldStatus, ticket.getId());
        }

        List<Ticket> targetTickets = new ArrayList<>(
            ticketRepository.findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(boardId, targetStatus)
        );
        targetTickets.removeIf(existingTicket -> existingTicket.getId().equals(ticket.getId()));

        int safeOrderIndex = Math.min(targetOrderIndex, targetTickets.size());
        ticket.setStatus(targetStatus);
        targetTickets.add(safeOrderIndex, ticket);

        reindexTickets(targetTickets);
    }

    // Entfernt Lücken in einer Spalte, nachdem ein Ticket diese Spalte verlassen hat.
    private void reindexColumnWithoutTicket(Long boardId, String status, Long ticketId) {
        List<Ticket> tickets = new ArrayList<>(
            ticketRepository.findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(boardId, status)
        );
        tickets.removeIf(ticket -> ticket.getId().equals(ticketId));
        reindexTickets(tickets);
    }

    // Vergibt fortlaufende orderIndex-Werte und speichert die neue Reihenfolge.
    private void reindexTickets(List<Ticket> tickets) {
        for (int i = 0; i < tickets.size(); i++) {
            tickets.get(i).setOrderIndex(i);
        }
        ticketRepository.saveAll(tickets);
    }

    // Räumt optionale Textfelder auf und speichert leere Strings als null.
    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    // Setzt Task als Standard, wenn im Formular kein Typ ausgewählt wurde.
    private String normalizeTicketType(String value) {
        String normalized = normalizeText(value);
        if ("Aufgabe".equalsIgnoreCase(normalized)) {
            return "Task";
        }
        return normalized == null ? "Task" : normalized;
    }

    // Baut eine einheitliche 400-Fehlerantwort.
    private ResponseEntity<Map<String, String>> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("message", message));
    }

    // Baut eine einheitliche 403-Fehlerantwort.
    private ResponseEntity<Map<String, String>> forbidden(String message) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", message));
    }

    // Baut eine einheitliche 404-Fehlerantwort.
    private ResponseEntity<Map<String, String>> notFound(String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
    }
}
