package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.Send;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SendRepository extends JpaRepository<Send, UUID> {

    Optional<Send> findByAccessId(String accessId);

    List<Send> findByExpiresAtBefore(LocalDateTime dateTime);

    List<Send> findByOwnerId(UUID ownerId);
}