package de.fom.projektdashboard.model.ticket;

import de.fom.projektdashboard.model.board.Board;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TicketStatus status = TicketStatus.TODO;

    @Column(nullable = false)
    private Integer orderIndex = 0;

    @ManyToOne
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Setzt Standardwerte und Zeitstempel, bevor ein Ticket erstmals gespeichert wird.
    @PrePersist
    void onCreate() {
        if (status == null) {
            status = TicketStatus.TODO;
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
