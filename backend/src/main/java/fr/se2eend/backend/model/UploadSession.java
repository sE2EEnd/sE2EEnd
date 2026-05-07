package fr.se2eend.backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "upload_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadSession {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "send_id", nullable = false)
    private Send send;

    @Column(nullable = false)
    private String filename;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}