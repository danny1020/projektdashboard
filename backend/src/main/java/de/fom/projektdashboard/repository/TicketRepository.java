package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.ticket.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByBoardIdOrderByCreatedAtDesc(Long boardId);

    List<Ticket> findByBoardIdInOrderByCreatedAtDesc(List<Long> boardIds);
}
