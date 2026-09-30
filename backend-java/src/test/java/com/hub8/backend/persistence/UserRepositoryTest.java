package com.hub8.backend.persistence;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserRepositoryTest {
    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final JdbcPageSupport pages = mock(JdbcPageSupport.class);

    @Test
    void roleReplacementDeletesAndReinsertsAssignmentsWithBoundIds() {
        UserRepository repository = new UserRepository(jdbc, pages);
        repository.replaceRoles(12, List.of(2L, 5L));

        verify(jdbc).update("DELETE FROM USER_ROLES WHERE USER_ID = ?", 12L);
        verify(jdbc).update("INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)", 12L, 2L);
        verify(jdbc).update("INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)", 12L, 5L);
    }

    @Test
    void administratorGuardCountsOnlyOtherActiveAdministrators() {
        when(jdbc.queryForObject(anyString(), eq(Integer.class), any())).thenReturn(2);
        UserRepository repository = new UserRepository(jdbc, pages);

        repository.countOtherActiveAdmins(12);

        verify(jdbc).queryForObject(
                "SELECT COUNT(*) FROM USERS U JOIN USER_ROLES UR ON UR.USER_ID = U.ID JOIN ROLES R ON R.ID = UR.ROLE_ID WHERE U.ACTIVE = 1 AND R.ACTIVE = 1 AND R.CODE = 'ADMIN' AND U.ID <> ?",
                Integer.class, 12L);
    }
}
