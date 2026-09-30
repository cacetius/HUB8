package com.hub8.backend.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditRepository {
    private final JdbcTemplate jdbc;
    private final JdbcPageSupport pages;

    public AuditRepository(JdbcTemplate jdbc, JdbcPageSupport pages) {
        this.jdbc = jdbc;
        this.pages = pages;
    }

    public Map<String, Object> list(Map<String, ?> filters, int page, int size) {
        StringBuilder sql = new StringBuilder("SELECT * FROM AUDIT_LOG");
        List<Object> args = new ArrayList<>();
        List<String> conditions = new ArrayList<>();
        addFilter(filters, conditions, args, "userId", "USER_ID");
        addFilter(filters, conditions, args, "action", "ACTION");
        addFilter(filters, conditions, args, "entity", "ENTITY");
        addFilter(filters, conditions, args, "entityId", "ENTITY_ID");
        addFilter(filters, conditions, args, "from", "DATE_TIME >=", true);
        addFilter(filters, conditions, args, "to", "DATE_TIME <=", true);
        if (!conditions.isEmpty()) sql.append(" WHERE ").append(String.join(" AND ", conditions));
        return pages.page(sql.toString(), args, page, size, "DATE_TIME DESC, ID DESC");
    }

    public Map<String, Object> listByEntity(String entity, String entityId, int page, int size) {
        return pages.page("SELECT * FROM AUDIT_LOG WHERE ENTITY = ? AND ENTITY_ID = ?",
                List.of(entity, entityId), page, size, "DATE_TIME DESC");
    }

    public List<Map<String, Object>> find(long id) {
        return jdbc.queryForList("SELECT * FROM AUDIT_LOG WHERE ID = ?", id);
    }

    public void insert(long userId, String action, String entity, String entityId,
            String oldValue, String newValue, String ip, String userAgent) {
        jdbc.update("INSERT INTO AUDIT_LOG (USER_ID, ACTION, ENTITY, ENTITY_ID, OLD_VALUE, NEW_VALUE, IP, USER_AGENT, SOURCE) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                userId, action, entity, entityId, oldValue, newValue, ip, userAgent, "API");
    }

    private static void addFilter(Map<String, ?> filters, List<String> conditions, List<Object> args,
            String key, String column) {
        addFilter(filters, conditions, args, key, column, false);
    }

    private static void addFilter(Map<String, ?> filters, List<String> conditions, List<Object> args,
            String key, String column, boolean comparison) {
        if (filters.containsKey(key)) {
            conditions.add(column + (comparison ? " ?" : " = ?"));
            args.add(filters.get(key));
        }
    }
}
