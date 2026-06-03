package de.fom.projektdashboard.controller;

import de.fom.projektdashboard.model.ticket.Comment;
import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.repository.CommentRepository;
import de.fom.projektdashboard.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/tickets")
public class CommentController {

    @Autowired
    private TicketRepository ticketRepository;
    @Autowired
    private CommentRepository commentRepository;

    @PostMapping("/{ticketId}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long ticketId,
                                        @RequestBody Comment comment,
                                        Principal principal) {

        Ticket ticket = ticketRepository.findById(ticketId)
            .orElseThrow(() -> new RuntimeException("Ticket nicht gefunden"));

        comment.setTicket(ticket);
        comment.setAuthor(principal.getName());
        comment.setCreatedAt(LocalDateTime.now());

        // Speichere und gib den gespeicherten Kommentar zurück
        Comment savedComment = commentRepository.save(comment);

        return ResponseEntity.ok(savedComment);
    }
}
