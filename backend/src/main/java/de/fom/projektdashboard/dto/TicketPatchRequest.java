package de.fom.projektdashboard.dto;

import de.fom.projektdashboard.model.ticket.TicketStatus;
import lombok.Data;

@Data
public class TicketPatchRequest {
    private String title;
    private String description;
    private TicketStatus status;
}
