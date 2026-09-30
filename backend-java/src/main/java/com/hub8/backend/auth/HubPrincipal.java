package com.hub8.backend.auth;

import java.util.List;
import java.util.Map;

public record HubPrincipal(long id, String username, String displayName, List<String> roles,
                           List<String> permissions) {
    public Map<String, Object> toMap() {
        return Map.of("id", id, "username", username, "displayName", displayName,
                "roles", roles, "permissions", permissions);
    }
}
