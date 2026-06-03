package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.DeletedSend;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeletedSendRepository extends JpaRepository<DeletedSend, UUID> {
}
