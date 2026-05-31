package de.fom.projektdashboard.dto;

import de.fom.projektdashboard.model.ticket.TicketStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TicketRequest {
    @NotNull(message = "boardId darf nicht leer sein")
    private Long boardId;

    @NotBlank(message = "Titel darf nicht leer sein")
    private String title;

    private String description;

    private TicketStatus status;

    @Min(value = 0, message = "orderIndex darf nicht negativ sein")
    private Integer orderIndex;
}
