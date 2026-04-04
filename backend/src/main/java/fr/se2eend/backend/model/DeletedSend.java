package fr.se2eend.backend.model;

import fr.se2eend.backend.model.enums.DeleteReason;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deleted_sends")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeletedSend {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "original_send_id", nullable = false)
    private UUID originalSendId;

    @Column(name = "access_id", length = 22)
    private String accessId;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "owner_email")
    private String ownerEmail;

    @Column(name = "send_created_at")
    private LocalDateTime sendCreatedAt;

    @Column(name = "deleted_at", nullable = false)
    private LocalDateTime deletedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "delete_reason", nullable = false, length = 50)
    private DeleteReason deleteReason;

    @Column(name = "file_count", nullable = false)
    private int fileCount;

    @Column(name = "total_size_bytes", nullable = false)
    private long totalSizeBytes;
}
