package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.Send;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SendRepository extends JpaRepository<Send, UUID>, JpaSpecificationExecutor<Send> {

    Optional<Send> findByAccessId(String accessId);

    List<Send> findByExpiresAtBefore(LocalDateTime dateTime);

    List<Send> findByOwnerId(UUID ownerId);

    List<Send> findByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update Send s set s.downloadCount = s.downloadCount + 1 where s.id = :id and s.downloadCount < s.maxDownloads")
    int incrementDownloadCountIfBelowLimit(@Param("id") UUID id);
}
