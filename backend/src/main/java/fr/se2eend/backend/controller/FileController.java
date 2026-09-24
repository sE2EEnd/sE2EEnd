package fr.se2eend.backend.controller;

import fr.se2eend.backend.model.FileMetadata;
import fr.se2eend.backend.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
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
}

