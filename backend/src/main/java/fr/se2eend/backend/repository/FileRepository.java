package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.FileMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileRepository extends JpaRepository<FileMetadata, UUID> {
    List<FileMetadata> findBySendId(UUID sendId);
}