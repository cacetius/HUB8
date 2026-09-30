package com.hub8.backend.persistence;

import com.hub8.backend.config.HubSettings;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JdbcPageSupportTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final HubSettings settings = mock(HubSettings.class);

    @Test
    void db2KeepsFetchFirstPaginationAndDb2IdentitySyntax() {
        when(settings.getDatabaseProvider()).thenReturn("db2");
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of(Map.of("ID", 3)));
        when(jdbc.queryForObject(anyString(), eq(Number.class), any(Object[].class))).thenReturn(1);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("ID", 7));
        JdbcPageSupport pages = new JdbcPageSupport(jdbc, settings);

        Map<String, Object> result = pages.page("SELECT * FROM APPS WHERE ACTIVE = 1", List.of(), 2, 10, "NAME");
        long id = pages.insert("APPS", List.of("NAME"), List.of("Factory"));

        assertEquals(1L, result.get("total"));
        assertEquals(7L, id);
        verify(jdbc).queryForList("SELECT * FROM APPS WHERE ACTIVE = 1 ORDER BY NAME OFFSET 10 ROWS FETCH FIRST 10 ROWS ONLY", new Object[0]);
        verify(jdbc).queryForMap("SELECT IDENTITY_VAL_LOCAL() AS ID FROM SYSIBM.SYSDUMMY1");
    }

    @Test
    void sqlServerKeepsFetchNextPaginationAndScopeIdentitySyntax() {
        when(settings.getDatabaseProvider()).thenReturn("sqlserver");
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Number.class), any(Object[].class))).thenReturn(0);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("ID", 9));
        JdbcPageSupport pages = new JdbcPageSupport(jdbc, settings);

        pages.page("SELECT * FROM USERS", List.of(), 3, 20, "USERNAME");
        long id = pages.insert("USERS", List.of("USERNAME"), List.of("operator"));

        assertEquals(9L, id);
        verify(jdbc).queryForList("SELECT * FROM USERS ORDER BY USERNAME OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY", new Object[0]);
        verify(jdbc).queryForMap("SELECT CAST(SCOPE_IDENTITY() AS INT) AS ID");
    }
}
