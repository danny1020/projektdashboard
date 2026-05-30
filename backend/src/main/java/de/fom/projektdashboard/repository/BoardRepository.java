package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.board.Board;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, Long> {
    List<Board> findByOwnerUsername(String username);
}
