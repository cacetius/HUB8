package com.hub8.backend.persistence;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DashboardRepository {
    private final JdbcTemplate jdbc;

    public DashboardRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isReady() {
        try {
            jdbc.queryForObject("SELECT 1 AS OK", Integer.class);
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
