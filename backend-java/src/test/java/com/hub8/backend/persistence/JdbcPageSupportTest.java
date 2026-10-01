package com.hub8.backend.persistence;

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

    @Test
    void sqlServerKeepsFetchNextPaginationAndScopeIdentitySyntax() {
        when(jdbc.queryForList(anyString(), any(Object[].class))).thenReturn(List.of());
        when(jdbc.queryForObject(anyString(), eq(Number.class), any(Object[].class))).thenReturn(0);
        when(jdbc.queryForMap(anyString())).thenReturn(Map.of("ID", 9));
        JdbcPageSupport pages = new JdbcPageSupport(jdbc);

        pages.page("SELECT * FROM USERS", List.of(), 3, 20, "USERNAME");
        long id = pages.insert("USERS", List.of("USERNAME"), List.of("operator"));

        assertEquals(9L, id);
        verify(jdbc).queryForList("SELECT * FROM USERS ORDER BY USERNAME OFFSET 40 ROWS FETCH NEXT 20 ROWS ONLY", new Object[0]);
        verify(jdbc).queryForMap("SELECT CAST(SCOPE_IDENTITY() AS INT) AS ID");
    }
}
