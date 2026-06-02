package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.board.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {
    List<BoardColumn> findByBoardIdOrderByPositionAsc(Long boardId);
    Optional<BoardColumn> findByBoardIdAndColumnKey(Long boardId, String columnKey);
}
