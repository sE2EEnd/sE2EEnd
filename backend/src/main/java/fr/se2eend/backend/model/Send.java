package fr.se2eend.backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import fr.se2eend.backend.model.enums.SendType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "sends")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Send {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "access_id", unique = true, nullable = false, length = 22)
    private String accessId;

    @Column(name = "owner_id")
    private UUID ownerId;

    @Column(name = "owner_name")
    private String ownerName;

    @Column(name = "owner_email")
    private String ownerEmail;

    @Column(name = "name")
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SendType type;

    @Lob
    @Column(name = "encrypted_metadata")
    private String encryptedMetadata;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "max_downloads", nullable = false)
    private Integer maxDownloads = 1;

    @Column(name = "download_count", nullable = false)
    private Integer downloadCount = 0;

    @Column(name = "password_protected", nullable = false)
    private boolean passwordProtected = false;

    @Column(name = "password_hash", length = 60)
    private String passwordHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(nullable = false)
    private boolean revoked = false;

    @OneToMany(mappedBy = "send", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonManagedReference
    private List<FileMetadata> files;
}
