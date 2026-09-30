package com.hub8.backend.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.config.HubSettings;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

@Component
public class JwtTokens {
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private final HubSettings settings;
    private final ObjectMapper mapper;

    public JwtTokens(HubSettings settings, ObjectMapper mapper) {
        this.settings = settings;
        this.mapper = mapper;
    }

    public String issue(long id, String username, List<String> roles, List<String> permissions) {
        try {
            long now = Instant.now().getEpochSecond();
            Map<String, Object> claims = new LinkedHashMap<>();
            claims.put("id", id);
            claims.put("username", username);
            claims.put("roles", roles);
            claims.put("permissions", permissions);
            claims.put("iat", now);
            claims.put("exp", now + HubSettings.parseExpiry(settings.getJwtExpiresIn()).toMillis() / 1000d);
            String header = ENCODER.encodeToString(mapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            String payload = ENCODER.encodeToString(mapper.writeValueAsBytes(claims));
            String content = header + "." + payload;
            return content + "." + ENCODER.encodeToString(mac(content));
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível gerar a sessão.", ex);
        }
    }

    public Map<String, Object> verify(String token) {
        try {
            String[] sections = token.split("\\.", -1);
            if (sections.length != 3) throw new IllegalArgumentException();
            Map<String, Object> header = mapper.readValue(Base64.getUrlDecoder().decode(sections[0]), new TypeReference<>() {});
            if (!"HS256".equals(header.get("alg"))) throw new IllegalArgumentException();
            byte[] actual = Base64.getUrlDecoder().decode(sections[2]);
            if (!MessageDigest.isEqual(mac(sections[0] + "." + sections[1]), actual)) throw new IllegalArgumentException();
            Map<String, Object> claims = mapper.readValue(Base64.getUrlDecoder().decode(sections[1]), new TypeReference<>() {});
            Object exp = claims.get("exp");
            if (exp != null && !(exp instanceof Number)) throw new IllegalArgumentException();
            if (exp instanceof Number number && Instant.now().getEpochSecond() >= number.doubleValue())
                throw new IllegalArgumentException();
            return claims;
        } catch (Exception ex) {
            throw ApiException.expired("Sessão inválida ou expirada.");
        }
    }

    private byte[] mac(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(settings.getJwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.US_ASCII));
    }
}
