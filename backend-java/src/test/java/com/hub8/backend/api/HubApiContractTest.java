package com.hub8.backend.api;

import com.hub8.backend.service.HubService;
import com.hub8.backend.auth.JwtTokens;
import com.hub8.backend.config.HubSettings;
import com.hub8.backend.persistence.SharePointFileStore;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(HubApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(ApiExceptionHandler.class)
class HubApiContractTest {
    @Autowired MockMvc mvc;
    @MockBean HubService service;
    @MockBean JdbcTemplate jdbc;
    @MockBean JwtTokens tokens;
    @MockBean HubSettings settings;
    @MockBean SharePointFileStore files;

    @Test
    void healthUsesLegacyHealthShape() throws Exception {
        mvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ok"))
                .andExpect(jsonPath("$.success").doesNotExist());
    }

    @Test
    void loginReturnsSuccessEnvelopeAndCreatedSessionData() throws Exception {
        Map<String, Object> user = Map.of("id", 7, "username", "admin", "displayName", "Admin",
                "roles", java.util.List.of("ADMIN"), "permissions", java.util.List.of("apps.view"));
        when(service.login(org.mockito.ArgumentMatchers.any(), anyString(), org.mockito.ArgumentMatchers.nullable(String.class)))
                .thenReturn(Map.of("token", "jwt-value", "user", user));
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
                        .content("{\"username\":\"admin\",\"password\":\"a-long-password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.token").value("jwt-value"))
                .andExpect(jsonPath("$.data.user.roles[0]").value("ADMIN"));
    }

    @Test
    void paginationRejectsOversizedPagesWithNodeErrorContract() throws Exception {
        mvc.perform(get("/api/v1/apps?page=1&pageSize=101"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.message").value("pageSize não pode ser maior que 100."))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void nonObjectPayloadGetsTheSameValidationEnvelopeAsNode() throws Exception {
        mvc.perform(post("/api/v1/apps").contentType("application/json").content("[]"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("O corpo da requisição deve ser um objeto."))
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void htmlUploadRejectsPathsAndNonHtmlBodiesBeforeCallingStorage() throws Exception {
        mvc.perform(post("/api/v1/files/html").contentType("application/json")
                        .content("{\"fileName\":\"../module.html\",\"content\":\"<html></html>\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        org.mockito.Mockito.verifyNoInteractions(files);
    }

    @Test
    void legacyBackupRequiresItsExpectedShapeBeforeCallingStorage() throws Exception {
        mvc.perform(post("/api/v1/files/legacy-backups").contentType("application/json")
                        .content("{\"data\":{\"config\":{},\"apps\":\"not-an-array\"}}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        org.mockito.Mockito.verifyNoInteractions(files);
    }

    @Test
    void missingDatabaseReadinessIsUnavailableWithoutLeakingDetails() throws Exception {
        when(service.ready()).thenReturn(false);
        mvc.perform(get("/ready"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value("unavailable"));
    }
}
