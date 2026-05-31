package de.fom.projektdashboard.controller;

import de.fom.projektdashboard.dto.TicketPatchRequest;
import de.fom.projektdashboard.dto.TicketRequest;
import de.fom.projektdashboard.dto.TicketResponse;
import de.fom.projektdashboard.model.board.Board;
import de.fom.projektdashboard.model.board.BoardMember;
import de.fom.projektdashboard.model.board.BoardRole;
import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.model.ticket.TicketStatus;
import de.fom.projektdashboard.repository.BoardMemberRepository;
import de.fom.projektdashboard.repository.BoardRepository;
import de.fom.projektdashboard.repository.TicketRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;

    public TicketController(TicketRepository ticketRepository, BoardRepository boardRepository,
                            BoardMemberRepository boardMemberRepository) {
        this.ticketRepository = ticketRepository;
        this.boardRepository = boardRepository;
        this.boardMemberRepository = boardMemberRepository;
    }

    // Lädt Tickets für ein bestimmtes Board oder alle Boards des eingeloggten Users.
    @GetMapping
    public ResponseEntity<?> getTickets(@RequestParam(required = false) Long boardId, Principal principal) {
        List<Ticket> tickets;

        if (boardId != null) {
            var membership = boardMemberRepository.findByBoardIdAndUserUsername(boardId, principal.getName());
            if (membership.isEmpty()) {
                return forbidden("Du hast keinen Zugriff auf dieses Board.");
            }
            tickets = ticketRepository.findByBoardIdOrderByCreatedAtDesc(boardId);
        } else {
            List<Long> boardIds = boardMemberRepository.findByUserUsername(principal.getName()).stream()
                .map(BoardMember::getBoard)
                .map(Board::getId)
                .toList();

            tickets = boardIds.isEmpty()
                ? List.of()
                : ticketRepository.findByBoardIdInOrderByCreatedAtDesc(boardIds);
        }

        return ResponseEntity.ok(tickets.stream().map(TicketResponse::from).toList());
    }

    // Erstellt ein neues Ticket in einem Board, wenn der User dort Schreibrechte hat.
    @PostMapping
    public ResponseEntity<?> createTicket(@Valid @RequestBody TicketRequest request, Principal principal) {
        Board board = boardRepository.findById(request.getBoardId()).orElse(null);
        if (board == null) {
            return notFound("Board wurde nicht gefunden.");
        }

        var membership = boardMemberRepository.findByBoardIdAndUserUsername(board.getId(), principal.getName());
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
        ticket.setStatus(request.getStatus() == null ? TicketStatus.TODO : request.getStatus());

        Ticket savedTicket = ticketRepository.save(ticket);
        return ResponseEntity.status(HttpStatus.CREATED).body(TicketResponse.from(savedTicket));
    }

    // Bearbeitet einzelne Ticket-Felder, wenn der User Zugriff und Schreibrechte auf das Board hat.
    @PatchMapping("/{id}")
    public ResponseEntity<?> updateTicket(@PathVariable Long id, @RequestBody TicketPatchRequest request,
                                          Principal principal) {
        Ticket ticket = ticketRepository.findById(id).orElse(null);
        if (ticket == null) {
            return notFound("Ticket wurde nicht gefunden.");
        }

        var membership = boardMemberRepository.findByBoardIdAndUserUsername(ticket.getBoard().getId(), principal.getName());
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

        if (request.getStatus() != null) {
            ticket.setStatus(request.getStatus());
            changed = true;
        }

        if (!changed) {
            return badRequest("Mindestens ein Feld muss zum Bearbeiten angegeben werden.");
        }

        Ticket savedTicket = ticketRepository.save(ticket);
        return ResponseEntity.ok(TicketResponse.from(savedTicket));
    }

    // Prüft, ob eine Board-Rolle Tickets erstellen und bearbeiten darf.
    private boolean canWriteTickets(BoardRole role) {
        return role == BoardRole.OWNER || role == BoardRole.ADMIN || role == BoardRole.MITARBEITER;
    }

    // Räumt optionale Textfelder auf und speichert leere Strings als null.
    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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
