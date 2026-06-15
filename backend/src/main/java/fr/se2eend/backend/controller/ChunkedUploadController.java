package fr.se2eend.backend.controller;

import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.model.UploadSession;
import fr.se2eend.backend.service.ChunkedUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files/chunked")
@RequiredArgsConstructor
@Tag(name = "Chunked Upload Controller", description = "Multi-part upload for large encrypted files.")
public class ChunkedUploadController {

    private final ChunkedUploadService chunkedUploadService;

    public record InitRequest(UUID sendId, String filename) {}
    public record InitResponse(UUID sessionId) {}
    public record CompleteRequest(int totalChunks, int chunkSize) {}

    @Operation(summary = "Initialize a chunked upload session")
    @PostMapping("/init")
    public ResponseEntity<InitResponse> init(@RequestBody InitRequest body) {
        UploadSession session = chunkedUploadService.initUpload(body.sendId(), body.filename());
        return ResponseEntity.status(HttpStatus.CREATED).body(new InitResponse(session.getId()));
    }

    @Operation(summary = "Upload a single chunk")
    @PutMapping(value = "/{sessionId}/chunk/{index}", consumes = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public ResponseEntity<Void> uploadChunk(
            @PathVariable UUID sessionId,
            @PathVariable int index,
            HttpServletRequest request) throws IOException {

        long contentLength = request.getContentLengthLong();
        chunkedUploadService.saveChunk(sessionId, index, request.getInputStream(), contentLength);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Finalize the upload and assemble the file")
    @PostMapping("/{sessionId}/complete")
    public ResponseEntity<FileMetadata> complete(
            @PathVariable UUID sessionId,
            @RequestBody CompleteRequest body) throws IOException {

        FileMetadata meta = chunkedUploadService.completeUpload(sessionId, body.totalChunks(), body.chunkSize());
        return ResponseEntity.status(HttpStatus.CREATED).body(meta);
    }
}