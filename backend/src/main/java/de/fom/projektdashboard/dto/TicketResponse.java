package de.fom.projektdashboard.dto;

import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.model.ticket.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private Long boardId;
    private String boardTitle;
    private String title;
    private String description;
    private TicketStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Wandelt die Datenbank-Entity in eine sichere API-Antwort ohne verschachtelte Userdaten um.
    public static TicketResponse from(Ticket ticket) {
        return new TicketResponse(
            ticket.getId(),
            ticket.getBoard().getId(),
            ticket.getBoard().getTitle(),
            ticket.getTitle(),
            ticket.getDescription(),
            ticket.getStatus(),
            ticket.getCreatedAt(),
            ticket.getUpdatedAt()
        );
    }
}
