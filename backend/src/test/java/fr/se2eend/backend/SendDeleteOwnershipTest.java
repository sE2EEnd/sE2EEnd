package fr.se2eend.backend;

import fr.se2eend.backend.model.Send;
import fr.se2eend.backend.model.enums.SendType;
import fr.se2eend.backend.repository.DeletedSendRepository;
import fr.se2eend.backend.repository.SendRepository;
import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Only a Send's owner may delete it.
 * <p>
 * A non-owner must be rejected (404, not 403, so the existence of a Send isn't leaked to a
 * non-owner) and the Send must survive the attempt. Mirrors {@link FileAttachOwnershipTest}.
 */
@SpringBootTest
@ActiveProfiles("test")
class SendDeleteOwnershipTest {

    private static final String OWNER_SUB = "11111111-1111-1111-1111-111111111111";
    private static final String INTRUDER_SUB = "22222222-2222-2222-2222-222222222222";

    @Autowired private WebApplicationContext context;
    @Autowired private SendRepository sendRepository;
    @Autowired private DeletedSendRepository deletedSendRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    @AfterEach
    void tearDown() {
        deletedSendRepository.deleteAll();
        sendRepository.deleteAll();
    }

    private Send createSendOwnedByOwner() {
        Send send = Send.builder()
                .accessId(UUID.randomUUID().toString().replace("-", "").substring(0, 22))
                .ownerId(UUID.fromString(OWNER_SUB))
                .type(SendType.FILE)
                .maxDownloads(5)
                .createdAt(LocalDateTime.now())
                .build();
        return sendRepository.save(send);
    }

    @Test
    @WithMockJwtUser(sub = INTRUDER_SUB)
    void delete_nonOwner_returnsNotFoundAndSendSurvives() throws Exception {
        Send send = createSendOwnedByOwner();

        mockMvc.perform(delete("/api/v1/sends/{id}", send.getId()))
                .andExpect(status().isNotFound());

        assertThat(sendRepository.findById(send.getId())).isPresent();
    }

    @Test
    @WithMockJwtUser(sub = OWNER_SUB)
    void delete_owner_returnsNoContentAndSendIsRemoved() throws Exception {
        Send send = createSendOwnedByOwner();

        mockMvc.perform(delete("/api/v1/sends/{id}", send.getId()))
                .andExpect(status().isNoContent());

        assertThat(sendRepository.findById(send.getId())).isEmpty();
    }
}
