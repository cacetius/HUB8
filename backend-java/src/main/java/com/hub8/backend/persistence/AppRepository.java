package com.hub8.backend.persistence;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AppRepository {
    private final JdbcTemplate jdbc;
    private final JdbcPageSupport pages;

    public AppRepository(JdbcTemplate jdbc, JdbcPageSupport pages) {
        this.jdbc = jdbc;
        this.pages = pages;
    }

    public Map<String, Object> list(int page, int size, String search) {
        String sql = "SELECT * FROM APPS WHERE ACTIVE = 1" + (search == null || search.trim().isEmpty() ? "" : " AND (NAME LIKE ? OR CATEGORY LIKE ?)");
        List<Object> args = search == null || search.trim().isEmpty() ? List.of()
                : List.of("%" + search.trim() + "%", "%" + search.trim() + "%");
        return pages.page(sql, args, page, size, "SORT_ORDER, NAME");
    }

    public List<Map<String, Object>> findActive(long id) {
        return jdbc.queryForList("SELECT * FROM APPS WHERE ID = ? AND ACTIVE = 1", id);
    }

    public List<Map<String, Object>> findAny(long id) {
        return jdbc.queryForList("SELECT * FROM APPS WHERE ID = ?", id);
    }

    public long insert(List<String> columns, List<?> args) { return pages.insert("APPS", columns, args); }

    public void update(long id, Map<String, Object> values, Map<String, String> columns, long actor) {
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        values.forEach((key, value) -> { sets.add(columns.get(key) + " = ?"); args.add(value); });
        sets.add("UPDATED_BY = ?"); args.add(actor);
        sets.add("UPDATED_AT = CURRENT_TIMESTAMP"); args.add(id);
        jdbc.update("UPDATE APPS SET " + String.join(", ", sets) + " WHERE ID = ?", args.toArray());
    }

    public void setActive(long id, long actor, boolean active) {
        jdbc.update("UPDATE APPS SET ACTIVE = ?, UPDATED_BY = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?",
                active ? 1 : 0, actor, id);
    }
}
