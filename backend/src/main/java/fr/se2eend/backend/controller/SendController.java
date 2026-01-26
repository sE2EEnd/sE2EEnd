package fr.se2eend.backend.controller;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.dto.SendResponseDto;
import fr.se2eend.backend.service.SendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sends")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Send Controller", description = "Manage Send containers (metadata, expiration, etc.)")
public class SendController {

    private final SendService sendService;

    @Operation(
            summary = "List all Sends",
            description = "Retrieve all existing Send containers. Each Send groups one or more encrypted files."
    )
    @GetMapping
    public ResponseEntity<List<SendResponseDto>> getAllSends() {
        return ResponseEntity.ok(sendService.findAll());
    }

    @Operation(
            summary = "Retrieve a Send by ID",
            description = "Return detailed metadata and the list of attached files for a given Send ID."
    )
    @GetMapping("/{id}")
    public ResponseEntity<SendResponseDto> getSend(@PathVariable String id) {
        // Try to parse as UUID first, otherwise treat as accessId
        try {
            UUID uuid = UUID.fromString(id);
            return ResponseEntity.ok(sendService.findById(uuid));
        } catch (IllegalArgumentException e) {
            // Not a UUID, treat as accessId
            return ResponseEntity.ok(sendService.findByAccessId(id));
        }
    }

    @Operation(
            summary = "Create a new Send",
            description = """
            Create a new Send container that can hold one or more encrypted files.
            The Send is metadata-only — files are uploaded separately.
            """
    )
    @PostMapping
    public ResponseEntity<SendResponseDto> createSend(@Valid @RequestBody SendRequestDto request) {
        return ResponseEntity.ok(sendService.createSend(request));
    }

    @Operation(
            summary = "Delete a Send",
            description = "Delete a Send and all its attached files permanently."
    )
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSend(@PathVariable UUID id) {
        sendService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
