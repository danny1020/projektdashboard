package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.ticket.Ticket;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByBoardIdOrderByStatusAscOrderIndexAscCreatedAtAsc(Long boardId);

    List<Ticket> findByBoardIdInOrderByBoardIdAscStatusAscOrderIndexAscCreatedAtAsc(List<Long> boardIds);

    List<Ticket> findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(Long boardId, String status);

    @EntityGraph(attributePaths = {"comments"})
    List<Ticket> findByBoardId(Long boardId);

    @Modifying
    @Transactional
    @Query("UPDATE Ticket t SET t.status = :newStatus, t.orderIndex = 0 WHERE t.board.id = :boardId AND t.status = :oldStatus")
    void updateStatusForBoard(
        @Param("boardId") Long boardId,
        @Param("oldStatus") String oldStatus,
        @Param("newStatus") String newStatus
    );
}
