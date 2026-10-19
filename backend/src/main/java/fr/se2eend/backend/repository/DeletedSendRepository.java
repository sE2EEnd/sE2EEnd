package fr.se2eend.backend.repository;

import fr.se2eend.backend.model.DeletedSend;
import fr.se2eend.backend.model.enums.DeleteReason;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.UUID;

public interface DeletedSendRepository extends JpaRepository<DeletedSend, UUID> {

    Page<DeletedSend> findByOwnerId(UUID ownerId, Pageable pageable);

    Page<DeletedSend> findByOwnerIdAndDeleteReasonIn(UUID ownerId, Collection<DeleteReason> reasons, Pageable pageable);
}
