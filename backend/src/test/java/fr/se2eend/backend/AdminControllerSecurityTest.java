package fr.se2eend.backend;

import fr.se2eend.backend.support.WithMockJwtUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Security tests for AdminController.
 * Verifies that all admin endpoints enforce authentication and the 'admin' role.
 */
@SpringBootTest
@ActiveProfiles("test")
class AdminControllerSecurityTest {

    @Autowired private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }

    // -------------------------------------------------------------------------
    // Unauthenticated → 401
    // -------------------------------------------------------------------------

    @Test
    void adminEndpoints_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/admin/sends"))          .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/stats"))          .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/settings"))       .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/deleted-sends"))  .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/storage/metrics")).andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------
    // Authenticated but no admin role → 403
    // -------------------------------------------------------------------------

    @Test
    @WithMockJwtUser
    void adminSends_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/sends")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockJwtUser
    void adminStats_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockJwtUser
    void adminSettings_regularUser_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/settings")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockJwtUser
    void adminRevoke_regularUser_returns403() throws Exception {
        mockMvc.perform(post("/api/v1/admin/sends/{id}/revoke", UUID.randomUUID()))
                .andExpect(status().isForbidden());
    }

    // -------------------------------------------------------------------------
    // Admin role → passes security, reaches business logic
    // -------------------------------------------------------------------------

    @Test
    @WithMockUser(roles = "admin")
    void adminSends_withAdminRole_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/sends")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "admin")
    void adminStats_withAdminRole_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/stats")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "admin")
    void adminDeletedSends_withAdminRole_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/deleted-sends")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "admin")
    void adminSettings_withAdminRole_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/settings")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "admin")
    void adminRevoke_nonExistentSend_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/admin/sends/{id}/revoke", UUID.randomUUID()))
                .andExpect(status().isNotFound());
    }
}