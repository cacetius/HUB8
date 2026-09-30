package com.hub8.backend.bootstrap;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

@Component
@ConditionalOnProperty(name = "hub.bootstrap-admin", havingValue = "true")
public class AdminBootstrapRunner implements ApplicationRunner {
    private static final Logger LOG = LoggerFactory.getLogger(AdminBootstrapRunner.class);
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwords;
    private final TransactionTemplate transaction;

    public AdminBootstrapRunner(JdbcTemplate jdbc, PasswordEncoder passwords, TransactionTemplate transaction) {
        this.jdbc = jdbc;
        this.passwords = passwords;
        this.transaction = transaction;
    }

    @Override
    public void run(ApplicationArguments args) {
        String username = env("ADMIN_USERNAME");
        String displayName = env("ADMIN_DISPLAY_NAME");
        String password = env("ADMIN_INITIAL_PASSWORD");
        if (username == null || username.trim().isEmpty() || username.trim().length() > 80)
            throw new IllegalStateException("Defina ADMIN_USERNAME (até 80 caracteres).");
        if (displayName == null || displayName.trim().isEmpty() || displayName.trim().length() > 160)
            throw new IllegalStateException("Defina ADMIN_DISPLAY_NAME (até 160 caracteres).");
        if (password == null || password.length() < 14 || password.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalStateException("ADMIN_INITIAL_PASSWORD deve ter pelo menos 14 e no máximo 72 bytes.");
        String cleanUsername = username.trim();
        transaction.executeWithoutResult(status -> {
            if (!jdbc.queryForList("SELECT ID FROM USERS WHERE USERNAME = ?", cleanUsername).isEmpty())
                throw new IllegalStateException("Esse nome de usuário já existe; nenhum dado foi alterado.");
            List<Long> roles = jdbc.query("SELECT ID FROM ROLES WHERE CODE = 'ADMIN' AND ACTIVE = 1",
                    (rs, row) -> rs.getLong(1));
            if (roles.size() != 1)
                throw new IllegalStateException("O papel ADMIN não está provisionado. Execute migrations e seeds primeiro.");
            jdbc.update("INSERT INTO USERS (USERNAME, PASSWORD_HASH, DISPLAY_NAME) VALUES (?, ?, ?)",
                    cleanUsername, passwords.encode(password), displayName.trim());
            long id = jdbc.queryForObject("SELECT ID FROM USERS WHERE USERNAME = ?", Long.class, cleanUsername);
            jdbc.update("INSERT INTO USER_ROLES (USER_ID, ROLE_ID) VALUES (?, ?)", id, roles.get(0));
        });
        LOG.info("Administrador \"{}\" criado.", username.trim());
    }

    private static String env(String name) { return System.getenv(name); }
}
