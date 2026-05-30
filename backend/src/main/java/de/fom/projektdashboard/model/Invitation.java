package de.fom.projektdashboard.model;

import de.fom.projektdashboard.model.board.Board;
import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "invitations")
@Data
public class Invitation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne
    @JoinColumn(name = "invited_user_id", nullable = false)
    private User invitedUser;

    private boolean accepted = false;
}
