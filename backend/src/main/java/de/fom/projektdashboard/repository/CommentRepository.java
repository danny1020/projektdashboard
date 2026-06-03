package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.ticket.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
}
