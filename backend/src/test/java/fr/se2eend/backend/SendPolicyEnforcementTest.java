package fr.se2eend.backend;

import fr.se2eend.backend.dto.SendRequestDto;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.service.InstanceSettingsService;
import fr.se2eend.backend.service.SendService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class SendPolicyEnforcementTest {

    @Autowired
    private SendService sendService;

    @Autowired
    private InstanceSettingsService settingsService;

    @Autowired
    private SendRepository sendRepository;

    @BeforeEach
    void setUp() {
        sendRepository.deleteAll();
        setupMockUser();
    }

    @AfterEach
    void tearDown() {
        sendRepository.deleteAll();
        SecurityContextHolder.clearContext();
        // Reset setting to default
        settingsService.set("require_send_password", "false");
    }

    private void setupMockUser() {
        String userId = UUID.randomUUID().toString();
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("sub", userId)
                .claim("preferred_username", "testuser")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        
        JwtAuthenticationToken auth = new JwtAuthenticationToken(jwt, Collections.emptyList());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void testCreateSendWithoutPassword_whenNotRequired_shouldSucceed() {
        // Given: policy is NOT enforcing password
        settingsService.set("require_send_password", "false");

        SendRequestDto request = new SendRequestDto(
                "Test",
                SendType.FILE,
                "metadata",
                null,
                5,
                false,
                null
        );

        // When/Then: Should succeed
        assertNotNull(sendService.createSend(request));
    }

    @Test
    void testCreateSendWithoutPassword_whenRequired_shouldFail() {
        // Given: policy ENFORCES password
        settingsService.set("require_send_password", "true");

        SendRequestDto request = new SendRequestDto(
                "Test",
                SendType.FILE,
                "metadata",
                null,
                5,
                false,
                null
        );

        // When/Then: Should throw IllegalArgumentException
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> sendService.createSend(request));
        
        assertEquals("A password is required by this instance's policy", exception.getMessage());
    }

    @Test
    void testCreateSendWithPassword_whenRequired_shouldSucceed() {
        // Given: policy ENFORCES password
        settingsService.set("require_send_password", "true");

        SendRequestDto request = new SendRequestDto(
                "Test",
                SendType.FILE,
                "metadata",
                null,
                5,
                true,
                "secret-password"
        );

        // When/Then: Should succeed
        assertNotNull(sendService.createSend(request));
    }
}
