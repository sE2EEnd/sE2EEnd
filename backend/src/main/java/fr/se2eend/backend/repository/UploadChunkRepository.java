package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.UploadChunk;
import fr.se2eend.backend.model.UploadSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UploadChunkRepository extends JpaRepository<UploadChunk, UUID> {
    List<UploadChunk> findAllBySessionOrderByChunkIndex(UploadSession session);
    int countBySession(UploadSession session);
}