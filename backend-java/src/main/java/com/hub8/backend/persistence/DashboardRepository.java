package com.hub8.backend.persistence;

import java.util.Map;
import com.hub8.backend.config.HubSettings;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardRepository {
    private final JdbcTemplate jdbc;
    private final HubSettings settings;

    public DashboardRepository(JdbcTemplate jdbc, HubSettings settings) {
        this.jdbc = jdbc;
        this.settings = settings;
    }

    public boolean isReady() {
        try {
            String sql = settings.getDatabaseProvider().equals("db2")
                    ? "SELECT 1 AS OK FROM SYSIBM.SYSDUMMY1" : "SELECT 1 AS OK";
            jdbc.queryForObject(sql, Integer.class);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public Map<String, Object> countWithStatus(String table) {
        return jdbc.queryForMap("SELECT COUNT(*) AS TOTAL, COALESCE(SUM(CASE WHEN STATUS = 'ATIVO' THEN 1 ELSE 0 END), 0) AS ATIVOS FROM " + table + " WHERE ACTIVE = 1");
    }

    public Map<String, Object> count(String table) {
        return jdbc.queryForMap("SELECT COUNT(*) AS TOTAL FROM " + table + " WHERE ACTIVE = 1");
    }
}
