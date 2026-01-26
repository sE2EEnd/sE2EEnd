package fr.se2eend.backend.controller;

import fr.se2eend.backend.service.SendDownloadService;
import fr.se2eend.backend.service.SendDownloadService.DownloadStream;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sends")
@RequiredArgsConstructor
@Tag(name = "Send Download Controller", description = "Handle downloading encrypted files or ZIP archives for a given Send.")
public class SendDownloadController {

    private final SendDownloadService sendDownloadService;

    @Operation(
            summary = "Download all files from a Send",
            description = """
        Streams all encrypted files attached to the given Send using its access ID.
        - If the Send contains **one file**, returns it directly.
        - If it contains **multiple files**, returns a ZIP archive.
        Expiration, revocation, and download limits are enforced automatically.
        """
    )
    @GetMapping("/{accessId}/download")
    public ResponseEntity<InputStreamResource> download(
            @PathVariable String accessId,
            @RequestParam(required = false) String password) throws IOException {
        DownloadStream stream = sendDownloadService.downloadByAccessId(accessId, password);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);

        headers.setContentDisposition(
                ContentDisposition.attachment()
                        .filename(stream.filename())
                        .build()
        );

        if (stream.sizeBytes() != null) {
            headers.setContentLength(stream.sizeBytes());
        }

        return ResponseEntity
                .ok()
                .headers(headers)
                .body(new InputStreamResource(stream.stream()));
    }
}