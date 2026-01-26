package fr.se2eend.backend.controller;

import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "File Controller", description = "Handle encrypted file upload and download.")
public class FileController {

    private final FileService fileService;

    @Operation(
            summary = "Upload a file to an existing Send",
            description = "Attach a new encrypted file to the specified Send container (via its ID)."
    )
    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<FileMetadata> uploadFile(
            @RequestParam("sendId") UUID sendId,
            @RequestPart("file") MultipartFile file) throws IOException {

        FileMetadata saved = fileService.addFileToSend(sendId, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @Operation(
            summary = "Download a file",
            description = "Stream the binary content of a specific encrypted file by its ID."
    )
    @GetMapping("/{fileId}")
    public ResponseEntity<InputStreamResource> downloadFile(@PathVariable UUID fileId) throws IOException {
        var file = fileService.findMetadata(fileId);
        InputStream stream = fileService.readFile(fileId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDisposition(ContentDisposition
                .attachment()
                .filename(file.getFilename())
                .build());
        headers.setContentLength(file.getSizeBytes());

        return ResponseEntity.ok()
                .headers(headers)
                .body(new InputStreamResource(stream));
    }
}

