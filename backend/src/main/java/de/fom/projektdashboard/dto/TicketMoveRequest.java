package de.fom.projektdashboard.dto;

import de.fom.projektdashboard.model.ticket.TicketStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class TicketMoveRequest {
    @NotNull(message = "Status darf nicht leer sein")
    private TicketStatus status;

    @NotNull(message = "orderIndex darf nicht leer sein")
    @Min(value = 0, message = "orderIndex darf nicht negativ sein")
    private Integer orderIndex;
}
