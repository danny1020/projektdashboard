package de.fom.projektdashboard.model.board;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "board_columns")
@Data
@NoArgsConstructor
public class BoardColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    // Der technische Key (z. B. "TODO", "IN_PROGRESS", "BLOCKIERT")
    @Column(name = "column_key", nullable = false)
    private String columnKey;

    // Der anzeigbare Name (z. B. "Zu tun", "In Arbeit", "Wird blockiert")
    @Column(name = "label", nullable = false)
    private String label;

    @Column(name = "position")
    private Integer position = 0;
}
