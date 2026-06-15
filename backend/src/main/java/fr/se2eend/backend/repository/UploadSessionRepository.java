package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface UploadSessionRepository extends JpaRepository<UploadSession, UUID> {
    List<UploadSession> findAllByCreatedAtBefore(LocalDateTime cutoff);
}