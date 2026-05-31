package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.model.ticket.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByBoardIdOrderByStatusAscOrderIndexAscCreatedAtAsc(Long boardId);

    List<Ticket> findByBoardIdInOrderByBoardIdAscStatusAscOrderIndexAscCreatedAtAsc(List<Long> boardIds);

    List<Ticket> findByBoardIdAndStatusOrderByOrderIndexAscCreatedAtAsc(Long boardId, TicketStatus status);
}
