package com.hub8.backend.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.Ssl;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class HubConfiguration {
    @Bean
    HubSettings hubSettings() { return new HubSettings(); }

    @Bean
    DataSource dataSource(HubSettings settings) {
        String driver = "com.microsoft.sqlserver.jdbc.SQLServerDriver";
        String url = "jdbc:sqlserver://" + settings.getDbHost() + ":" + settings.getDbPort()
                + ";databaseName=" + settings.getDbName() + ";encrypt=true;trustServerCertificate="
                + (!settings.isProduction());
        try { Class.forName(driver); }
        catch (ClassNotFoundException ex) {
            throw new IllegalStateException("Driver JDBC SQL Server não está disponível.", ex);
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
    @ConditionalOnProperty(name = "ENTRA_ISSUER")
    JwtDecoder entraJwtDecoder(HubSettings settings) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withIssuerLocation(settings.getEntraIssuer()).build();
        OAuth2TokenValidator<Jwt> audienceValidator = jwt -> jwt.getAudience().contains(settings.getEntraAudience())
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(settings.getEntraIssuer()), audienceValidator));
        return decoder;
    }

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
