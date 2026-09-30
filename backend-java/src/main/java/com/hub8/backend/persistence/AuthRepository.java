package com.hub8.backend.persistence;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
    private final JdbcTemplate jdbc;

    public AuthRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<Map<String, Object>> findActiveUser(String username) {
        return jdbc.queryForList("SELECT ID, USERNAME, DISPLAY_NAME, PASSWORD_HASH FROM USERS WHERE USERNAME = ? AND ACTIVE = 1", username);
    }

    public List<String> roles(long userId) {
        return jdbc.query("SELECT R.CODE FROM ROLES R JOIN USER_ROLES UR ON UR.ROLE_ID = R.ID WHERE UR.USER_ID = ? AND R.ACTIVE = 1",
                (rs, row) -> rs.getString(1), userId);
    }

    public List<String> permissions(long userId) {
        return jdbc.query("SELECT DISTINCT P.CODE FROM PERMISSIONS P JOIN ROLE_PERMISSIONS RP ON RP.PERMISSION_ID = P.ID JOIN USER_ROLES UR ON UR.ROLE_ID = RP.ROLE_ID JOIN ROLES R ON R.ID = UR.ROLE_ID AND R.ACTIVE = 1 WHERE UR.USER_ID = ?",
                (rs, row) -> rs.getString(1), userId);
    }
}
