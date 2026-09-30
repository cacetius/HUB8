package com.hub8.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.Ssl;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class HubConfiguration {
    @Bean
    HubSettings hubSettings() { return new HubSettings(); }

    @Bean
    DataSource dataSource(HubSettings settings) {
        String url;
        String driver;
        if (settings.getDatabaseProvider().equals("sqlserver")) {
            url = "jdbc:sqlserver://" + settings.getDbHost() + ":" + settings.getDbPort()
                    + ";databaseName=" + settings.getDbName() + ";encrypt=true;trustServerCertificate="
                    + (!settings.isProduction());
            driver = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        } else if (settings.getDatabaseProvider().equals("db2")) {
            url = "jdbc:db2://" + settings.getDbHost() + ":" + settings.getDbPort() + "/" + settings.getDbName();
            driver = "com.ibm.db2.jcc.DB2Driver";
        } else {
            throw new IllegalStateException("DATABASE_PROVIDER inválido: " + settings.getDatabaseProvider());
        }
        try { Class.forName(driver); }
        catch (ClassNotFoundException ex) {
            throw new IllegalStateException(settings.getDatabaseProvider().equals("db2")
                    ? "Driver JDBC IBM DB2 não está no classpath. Obtenha o JCC licenciado da IBM e configure-o localmente; o projeto não o redistribui."
                    : "Driver JDBC SQL Server não está disponível.", ex);
        }
        HikariConfig pool = new HikariConfig();
        pool.setJdbcUrl(url);
        pool.setUsername(settings.getDbUser());
        pool.setPassword(settings.getDbPassword());
        pool.setDriverClassName(driver);
        pool.setMaximumPoolSize(10);
        pool.setMinimumIdle(1);
        pool.setConnectionTimeout(10_000);
        pool.setPoolName("hub8-db");
        return new HikariDataSource(pool);
    }

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    WebServerFactoryCustomizer<TomcatServletWebServerFactory> sslCustomizer(HubSettings settings) {
        return factory -> {
            if (!settings.isProduction()) return;
            Ssl ssl = new Ssl();
            ssl.setEnabled(true);
            ssl.setKeyStore(settings.getTlsKeyStore());
            ssl.setKeyStorePassword(settings.getTlsKeyStorePassword());
            ssl.setKeyStoreType(settings.getTlsKeyStoreType());
            if (!settings.getTlsKeyAlias().isBlank()) ssl.setKeyAlias(settings.getTlsKeyAlias());
            factory.setSsl(ssl);
        };
    }
}
