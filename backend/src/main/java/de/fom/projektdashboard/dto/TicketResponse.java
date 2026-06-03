package de.fom.projektdashboard.dto;

import de.fom.projektdashboard.model.ticket.Comment;
import de.fom.projektdashboard.model.ticket.Ticket;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class TicketResponse {
    private Long id;
    private Long boardId;
    private String boardTitle;
    private String title;
    private String description;
    private String type;
    private String priority;
    private String assigneeUsername;
    private String status;
    private Integer orderIndex;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<Comment> comments;

    // Wandelt die Datenbank-Entity in eine sichere API-Antwort ohne verschachtelte Userdaten um.
    public static TicketResponse from(Ticket ticket) {
        return new TicketResponse(
            ticket.getId(),
            ticket.getBoard().getId(),
            ticket.getBoard().getTitle(),
            ticket.getTitle(),
            ticket.getDescription(),
            ticket.getType(),
            ticket.getPriority(),
            ticket.getAssigneeUsername(),
            ticket.getStatus(),
            ticket.getOrderIndex() == null ? 0 : ticket.getOrderIndex(),
            ticket.getCreatedAt(),
            ticket.getUpdatedAt(),
            ticket.getComments()
        );
    }
}
