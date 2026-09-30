package com.hub8.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.auth.HubPrincipal;
import com.hub8.backend.auth.JwtTokens;
import com.hub8.backend.config.HubSettings;
import com.hub8.backend.persistence.AppRepository;
import com.hub8.backend.persistence.AuthRepository;
import com.hub8.backend.persistence.AuditRepository;
import com.hub8.backend.persistence.CatalogRepository;
import com.hub8.backend.persistence.DashboardRepository;
import com.hub8.backend.persistence.UserRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HubServiceRulesTest {
    private final AppRepository apps = mock(AppRepository.class);
    private final AuthRepository auth = mock(AuthRepository.class);
    private final AuditRepository audits = mock(AuditRepository.class);
    private final CatalogRepository catalogs = mock(CatalogRepository.class);
    private final DashboardRepository dashboard = mock(DashboardRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final HubService service = new HubService(apps, auth, audits, catalogs, dashboard, users,
            new BCryptPasswordEncoder(4), new JwtTokens(new HubSettings(), new ObjectMapper()), new ObjectMapper());
    private final HubPrincipal admin = new HubPrincipal(1, "admin", "Admin", List.of("ADMIN"), List.of("users.manage"));

    @Test
    void operatorMustHaveNameAndBadShiftTimesAreRejectedBeforeRepositoryWrites() {
        ApiException missingName = assertThrows(ApiException.class,
                () -> service.createCatalog("operators", Map.of("registration", "123"), admin, "127.0.0.1"));
        assertEquals("VALIDATION_ERROR", missingName.getCode());

        ApiException invalidTime = assertThrows(ApiException.class,
                () -> service.createCatalog("shifts", Map.of("name", "Night", "startTime", "25:00", "endTime", "06:00"), admin, "127.0.0.1"));
        assertEquals("VALIDATION_ERROR", invalidTime.getCode());
        verify(catalogs, never()).insert(anyString(), anyList(), anyList());
    }

    @Test
    void currentAdminCannotDisableTheirOwnAccountBeforeRepositoryWrite() {
        when(users.find(1)).thenReturn(List.of(Map.of("ID", 1, "USERNAME", "admin", "DISPLAY_NAME", "Admin", "ACTIVE", true)));
        when(users.roles(1)).thenReturn(List.of("ADMIN"));

        ApiException failure = assertThrows(ApiException.class,
                () -> service.updateUser(1, Map.of("active", false), admin, "127.0.0.1"));

        assertEquals("Não é possível desativar a própria conta.", failure.getMessage());
        verify(users, never()).update(eq(1L), anyMap(), eq(1L));
        verify(users, never()).replaceRoles(eq(1L), anyList());
    }

    @Test
    void createAppOrchestratesRepositoryInsertAndAudit() {
        when(apps.insert(anyList(), anyList())).thenReturn(21L);
        Map<String, Object> saved = Map.of("ID", 21, "NAME", "Factory", "URL", "/factory", "ACTIVE", true);
        when(apps.findActive(21)).thenReturn(List.of(saved));

        Map<String, Object> result = service.createApp(Map.of("name", " Factory ", "url", "/factory"), admin, "127.0.0.1");

        assertEquals(saved, result);
        verify(apps).insert(anyList(), anyList());
        verify(audits).insert(eq(1L), eq("CREATE"), eq("APPS"), eq("21"), eq(null), anyString(), eq("127.0.0.1"), eq(null));
    }

    @Test
    void multiTableUserWritesKeepTransactionalServiceBoundaries() throws Exception {
        assertTrue(HubService.class.getMethod("createUser", Map.class, HubPrincipal.class, String.class)
                .isAnnotationPresent(Transactional.class));
        assertTrue(HubService.class.getMethod("updateUser", long.class, Map.class, HubPrincipal.class, String.class)
                .isAnnotationPresent(Transactional.class));
        assertTrue(HubService.class.getMethod("setUserActive", long.class, boolean.class, HubPrincipal.class, String.class)
                .isAnnotationPresent(Transactional.class));
    }
}
