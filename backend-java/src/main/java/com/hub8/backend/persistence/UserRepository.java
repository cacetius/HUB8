package com.hub8.backend.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
    private static final String USER_COLUMNS = "ID, USERNAME, EMAIL, DISPLAY_NAME, ACTIVE, CREATED_AT, UPDATED_AT";
    private final JdbcTemplate jdbc;
    private final JdbcPageSupport pages;

    public UserRepository(JdbcTemplate jdbc, JdbcPageSupport pages) {
        this.jdbc = jdbc;
        this.pages = pages;
    }

    public Map<String, Object> list(int page, int size, String search) {
        String sql = "SELECT " + USER_COLUMNS + " FROM USERS";
        List<Object> args = new ArrayList<>();
        if (search != null && !search.trim().isEmpty()) {
            sql += " WHERE USERNAME LIKE ? OR DISPLAY_NAME LIKE ? OR EMAIL LIKE ?";
            String pattern = "%" + search.trim() + "%";
            args.addAll(List.of(pattern, pattern, pattern));
        }
        return pages.page(sql, args, page, size, "USERNAME");
    }

    public List<Map<String, Object>> find(long id) {
        return jdbc.queryForList("SELECT " + USER_COLUMNS + " FROM USERS WHERE ID = ?", id);
    }

    public List<Map<String, Object>> findActiveState(long id) {
        return jdbc.queryForList("SELECT ACTIVE FROM USERS WHERE ID = ?", id);
    }

    public boolean usernameExists(String username) {
        return !jdbc.queryForList("SELECT ID FROM USERS WHERE USERNAME = ?", username).isEmpty();
    }

    public boolean usernameExistsForOtherUser(String username, long id) {
        return !jdbc.queryForList("SELECT ID FROM USERS WHERE USERNAME = ? AND ID <> ?", username, id).isEmpty();
    }

    public List<Map<String, Object>> listRoles() {
        return jdbc.queryForList("SELECT ID, CODE, NAME FROM ROLES WHERE ACTIVE = 1 ORDER BY NAME");
    }

    public List<String> roles(long id) {
        return jdbc.query("SELECT R.CODE FROM USER_ROLES UR JOIN ROLES R ON R.ID = UR.ROLE_ID WHERE UR.USER_ID = ? AND R.ACTIVE = 1 ORDER BY R.CODE",
                (rs, row) -> rs.getString(1), id);
    }

    public List<Long> resolveRoleIds(List<String> codes) {
        String marks = String.join(", ", java.util.Collections.nCopies(codes.size(), "?"));
        return jdbc.query("SELECT ID FROM ROLES WHERE ACTIVE = 1 AND CODE IN (" + marks + ")",
                (rs, row) -> rs.getLong(1), codes.toArray());
    }

    public Integer countOtherActiveAdmins(long id) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM USERS U JOIN USER_ROLES UR ON UR.USER_ID = U.ID JOIN ROLES R ON R.ID = UR.ROLE_ID WHERE U.ACTIVE = 1 AND R.ACTIVE = 1 AND R.CODE = 'ADMIN' AND U.ID <> ?",
                Integer.class, id);
    }

    public long insert(String username, Object email, String passwordHash, Object displayName, int active,
            long actor, List<Long> roleIds) {
        long id = pages.insert("USERS",
                List.of("USERNAME", "EMAIL", "PASSWORD_HASH", "DISPLAY_NAME", "ACTIVE", "CREATED_BY", "UPDATED_BY"),
                java.util.Arrays.asList(username, email, passwordHash, displayName, active, actor, actor));
        replaceRoles(id, roleIds);
        return id;
    }

    public void update(long id, Map<String, Object> values, long actor) {
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        values.forEach((key, value) -> { sets.add(key + " = ?"); args.add(value); });
        sets.add("UPDATED_BY = ?"); args.add(actor);
        sets.add("UPDATED_AT = CURRENT_TIMESTAMP"); args.add(id);
        jdbc.update("UPDATE USERS SET " + String.join(", ", sets) + " WHERE ID = ?", args.toArray());
    }

    public void replaceRoles(long id, List<Long> roleIds) {
        jdbc.update("DELETE FROM USER_ROLES WHERE USER_ID = ?", id);
        for (long roleId : roleIds) jdbc.update("INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)", id, roleId);
    }
}
