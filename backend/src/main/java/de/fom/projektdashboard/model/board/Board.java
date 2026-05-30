package de.fom.projektdashboard.model.board;

import de.fom.projektdashboard.model.User;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "boards")
@Data
public class Board {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String joinPassword;

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;
}
