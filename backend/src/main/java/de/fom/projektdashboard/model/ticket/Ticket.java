package de.fom.projektdashboard.model.ticket;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import de.fom.projektdashboard.model.board.Board;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tickets")
@Data
@NoArgsConstructor
public class Ticket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "ticket_type")
    private String type = "Task";

    private String priority;

    @Column(name = "assignee_username")
    private String assigneeUsername;

    @Column(nullable = false)
    private String status = "TODO";

    @Column(nullable = false)
    private Integer orderIndex = 0;

    @ManyToOne
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Ticket.java
    @OneToMany(mappedBy = "ticket", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @JsonManagedReference // <--- PROBIER DAS ANSTELLE VON @JsonIgnore IN DER ENTITY!
    private List<Comment> comments = new ArrayList<>();

    // Setzt Standardwerte und Zeitstempel, bevor ein Ticket erstmals gespeichert wird.
    @PrePersist
    void onCreate() {
        if (status == null) {
            status = "TODO";
        }
        if (type == null || type.isBlank()) {
            type = "Task";
        }
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    // Aktualisiert den Zeitstempel, wenn ein bestehendes Ticket geändert wird.
    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
