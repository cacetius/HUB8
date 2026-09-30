package com.hub8.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.config.HubSettings;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RequestSecurityFilterTest {
    @Test
    void unauthenticatedCallsAreRejectedBeforeController() throws Exception {
        JwtTokens tokens = mock(JwtTokens.class);
        RequestSecurityFilter filter = new RequestSecurityFilter(new StubJdbcTemplate(List.of()), tokens,
                new HubSettings(), new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/apps");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"UNAUTHENTICATED\""));
        assertFalse(chain.getRequest() != null);
    }

    @Test
    void eachProtectedRequestUsesDatabasePermissionsInsteadOfJwtPermissionClaims() throws Exception {
        JwtTokens tokens = mock(JwtTokens.class);
        when(tokens.verify("valid-token")).thenReturn(Map.of("id", 2, "permissions", List.of("apps.view")));
        RequestSecurityFilter filter = new RequestSecurityFilter(new StubJdbcTemplate(List.of()), tokens,
                new HubSettings(), new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/apps");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"FORBIDDEN\""));
        assertTrue(chain.getRequest() == null);
    }

    @Test
    void shiftReadsRequireTheManagementPermission() throws Exception {
        JwtTokens tokens = mock(JwtTokens.class);
        when(tokens.verify("valid-token")).thenReturn(Map.of("id", 2, "permissions", List.of()));
        RequestSecurityFilter filter = new RequestSecurityFilter(new StubJdbcTemplate(List.of()), tokens,
                new HubSettings(), new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/shifts/current");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(chain.getRequest() == null);
        assertTrue(request.getAttribute("hubPrincipal") == null);
    }

    @Test
    void dashboardRequiresTheReportsPermission() throws Exception {
        JwtTokens tokens = mock(JwtTokens.class);
        when(tokens.verify("valid-token")).thenReturn(Map.of("id", 2, "permissions", List.of()));
        RequestSecurityFilter filter = new RequestSecurityFilter(new StubJdbcTemplate(List.of()), tokens,
                new HubSettings(), new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/dashboard/summary");
        request.addHeader("Authorization", "Bearer valid-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"FORBIDDEN\""));
        assertTrue(chain.getRequest() == null);
    }

    @Test
    void chunkedLoginBodiesAreCappedAtTwoMegabytes() throws Exception {
        RequestSecurityFilter filter = new RequestSecurityFilter(new StubJdbcTemplate(List.of()),
                mock(JwtTokens.class), new HubSettings(), new ObjectMapper());
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login") {
            @Override public int getContentLength() { return -1; }
            @Override public long getContentLengthLong() { return -1; }
        };
        request.setContent(new byte[2 * 1024 * 1024 + 1]);
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (req, res) -> req.getInputStream().readAllBytes());

        assertEquals(413, response.getStatus());
        assertTrue(response.getContentAsString().contains("\"code\":\"PAYLOAD_TOO_LARGE\""));
    }

    private static class StubJdbcTemplate extends JdbcTemplate {
        private final List<String> currentPermissions;
        StubJdbcTemplate(List<String> currentPermissions) { this.currentPermissions = currentPermissions; }

        @Override
        public List<Map<String, Object>> queryForList(String sql, Object... args) {
            return List.of(Map.of("ID", 2L, "USERNAME", "operator", "DISPLAY_NAME", "Operator"));
        }

        @Override
        @SuppressWarnings("unchecked")
        public <T> List<T> query(String sql, RowMapper<T> rowMapper, Object... args) {
            if (sql.contains("DISTINCT P.CODE")) return (List<T>) currentPermissions;
            return List.of();
        }
    }
}
