package com.hub8.backend.persistence;

import com.hub8.backend.config.HubSettings;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class JdbcPageSupport {
    private final JdbcTemplate jdbc;
    private final HubSettings settings;

    public JdbcPageSupport(JdbcTemplate jdbc, HubSettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    public Map<String, Object> page(String baseSql, List<?> params, int page, int pageSize, String order) {
        int offset = Math.multiplyExact(page - 1, pageSize);
        String pageSql = settings.getDatabaseProvider().equals("db2")
                ? baseSql + " ORDER BY " + order + " OFFSET " + offset + " ROWS FETCH FIRST " + pageSize + " ROWS ONLY"
                : baseSql + " ORDER BY " + order + " OFFSET " + offset + " ROWS FETCH NEXT " + pageSize + " ROWS ONLY";
        List<Map<String, Object>> rows = jdbc.queryForList(pageSql, params.toArray());
        Number total = jdbc.queryForObject("SELECT COUNT(*) AS TOTAL FROM (" + baseSql + ") AS T",
                Number.class, params.toArray());
        return Map.of("rows", rows, "total", total == null ? 0 : total.longValue(), "page", page, "pageSize", pageSize);
    }

    public long insert(String table, List<String> columns, List<?> args) {
        String marks = String.join(", ", java.util.Collections.nCopies(columns.size(), "?"));
        jdbc.update("INSERT INTO " + table + " (" + String.join(", ", columns) + ") VALUES (" + marks + ")", args.toArray());
        Object id = settings.getDatabaseProvider().equals("db2")
                ? jdbc.queryForMap("SELECT IDENTITY_VAL_LOCAL() AS ID FROM SYSIBM.SYSDUMMY1").get("ID")
                : jdbc.queryForMap("SELECT CAST(SCOPE_IDENTITY() AS INT) AS ID").get("ID");
        return ((Number) id).longValue();
    }
}
