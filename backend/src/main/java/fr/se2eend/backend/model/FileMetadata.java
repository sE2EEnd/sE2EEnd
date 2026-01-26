package fr.se2eend.backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileMetadata {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "send_id", nullable = false)
    @JsonBackReference
    private Send send;

    @Column(nullable = false)
    private String filename;

    @Column(name = "storage_path", nullable = false, length = 512)
    private String storagePath;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    @Column(length = 128)
    private String checksum;
}