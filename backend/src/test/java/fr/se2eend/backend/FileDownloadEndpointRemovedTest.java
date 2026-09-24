package fr.se2eend.backend;

import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
class FileDownloadEndpointRemovedTest {

    private static final String USER_SUB = "33333333-3333-3333-3333-333333333333";

    @Autowired private WebApplicationContext context;

    private MockMvc mockMvc;

    @Test
    @WithMockJwtUser(sub = USER_SUB)
    void getFileById_authenticated_routeNoLongerExists() throws Exception {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        mockMvc.perform(get("/api/v1/files/{fileId}", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }
}
