package com.hub8.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.config.HubSettings;
import java.time.Duration;
import java.util.List;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokensTest {
    @Test
    void issuesAndVerifiesHs256ClaimsExpectedByNodeBackend() {
        HubSettings settings = new HubSettings();
        JwtTokens tokens = new JwtTokens(settings, new ObjectMapper());
        var claims = tokens.verify(tokens.issue(42, "operator", List.of("OPERADOR"), List.of("apps.view")));
        assertEquals(42, ((Number) claims.get("id")).longValue());
        assertEquals("operator", claims.get("username"));
        assertEquals(List.of("OPERADOR"), claims.get("roles"));
        assertEquals(List.of("apps.view"), claims.get("permissions"));
        assertTrue(claims.containsKey("iat"));
        assertTrue(claims.containsKey("exp"));
    }

    @Test
    void rejectsModifiedTokensWithExpiredSessionCode() {
        JwtTokens tokens = new JwtTokens(new HubSettings(), new ObjectMapper());
        String jwt = tokens.issue(42, "operator", List.of(), List.of());
        String[] parts = jwt.split("\\.");
        String signature = parts[2];
        String replacement = (signature.charAt(0) == 'A' ? "B" : "A") + signature.substring(1);
        ApiException failure = assertThrows(ApiException.class,
                () -> tokens.verify(parts[0] + "." + parts[1] + "." + replacement));
        assertEquals("SESSION_EXPIRED", failure.getCode());
        assertEquals(401, failure.getStatus());
    }

    @Test
    void acceptsNodeCompatibleDurationUnits() {
        assertEquals(Duration.ofHours(8), HubSettings.parseExpiry("8h"));
        assertEquals(Duration.ofMinutes(90), HubSettings.parseExpiry("90m"));
        assertEquals(Duration.ofMinutes(90), HubSettings.parseExpiry("1.5 hours"));
        assertEquals(Duration.ofDays(14), HubSettings.parseExpiry("2 weeks"));
        assertEquals(Duration.ofMillis(250), HubSettings.parseExpiry("250ms"));
        assertThrows(IllegalStateException.class, () -> HubSettings.parseExpiry("8fortnights"));
    }

    @Test
    void bcryptEncoderUsesExistingNodeCompatibleFormatAndCost() {
        String hash = new BCryptPasswordEncoder(12).encode("valid-password-123");
        assertTrue(hash.startsWith("$2a$12$"));
        assertTrue(new BCryptPasswordEncoder(12).matches("valid-password-123", hash));
    }
}
