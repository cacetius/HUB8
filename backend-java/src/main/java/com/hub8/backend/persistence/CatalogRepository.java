package com.hub8.backend.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CatalogRepository {
    private final JdbcTemplate jdbc;
    private final JdbcPageSupport pages;

    public CatalogRepository(JdbcTemplate jdbc, JdbcPageSupport pages) {
        this.jdbc = jdbc;
        this.pages = pages;
    }

    public Map<String, Object> list(String table, int page, int size, String search, String order) {
        String sql = "SELECT * FROM " + table + " WHERE ACTIVE = 1" + (search == null || search.trim().isEmpty() ? "" : " AND NAME LIKE ?");
        List<?> args = search == null || search.trim().isEmpty() ? List.of() : List.of("%" + search.trim() + "%");
        return pages.page(sql, args, page, size, order);
    }

    public List<Map<String, Object>> find(String table, long id, boolean includeInactive) {
        return includeInactive
                ? jdbc.queryForList("SELECT * FROM " + table + " WHERE ID = ?", id)
                : jdbc.queryForList("SELECT * FROM " + table + " WHERE ID = ? AND ACTIVE = 1", id);
    }

    public List<Map<String, Object>> activeShifts() {
        return jdbc.queryForList("SELECT * FROM SHIFTS WHERE ACTIVE = 1 ORDER BY START_TIME");
    }

    public boolean operationIsActive(Object id) {
        return !jdbc.queryForList("SELECT ID FROM OPERATIONS WHERE ID = ? AND ACTIVE = 1", id).isEmpty();
    }

    public long insert(String table, List<String> columns, List<?> args) { return pages.insert(table, columns, args); }

    public void update(String table, long id, Map<String, Object> values, Map<String, String> columns,
            long actor, boolean audited) {
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        values.forEach((key, value) -> { sets.add(columns.get(key) + " = ?"); args.add(value); });
        if (audited) { sets.add("UPDATED_BY = ?"); args.add(actor); sets.add("UPDATED_AT = CURRENT_TIMESTAMP"); }
        args.add(id);
        jdbc.update("UPDATE " + table + " SET " + String.join(", ", sets) + " WHERE ID = ?", args.toArray());
    }

    public void setActive(String table, long id, long actor, boolean audited, boolean active) {
        String sql = "UPDATE " + table + " SET ACTIVE = ?" + (audited ? ", UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP" : "") + " WHERE ID = ?";
        if (audited) jdbc.update(sql, active ? 1 : 0, actor, id);
        else jdbc.update(sql, active ? 1 : 0, id);
    }
}
