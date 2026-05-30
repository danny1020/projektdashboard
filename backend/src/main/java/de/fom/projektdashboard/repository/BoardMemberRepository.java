package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.board.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BoardMemberRepository extends JpaRepository<BoardMember, Long> {
    List<BoardMember> findByBoardId(Long boardId);

    List<BoardMember> findByUserUsername(String username);

    Optional<BoardMember> findByBoardIdAndUserUsername(Long boardId, String username);
}
