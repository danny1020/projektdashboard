package de.fom.projektdashboard.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class TicketPatchRequest {
    private String title;
    private String description;
    private String type;
    private String priority;
    private String assigneeUsername;
    private String status;

    @Min(value = 0, message = "orderIndex darf nicht negativ sein")
    private Integer orderIndex;
}
