package de.fom.projektdashboard.repository;

import de.fom.projektdashboard.model.Invitation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InvitationRepository extends JpaRepository<Invitation, Long> {
    List<Invitation> findByInvitedUserUsernameAndAcceptedFalse(String username);
}
