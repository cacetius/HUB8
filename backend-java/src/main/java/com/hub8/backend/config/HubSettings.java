package com.hub8.backend.config;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import org.springframework.util.StringUtils;

public class HubSettings {
    private final String appEnv;
    private final int port;
    private final String databaseProvider;
    private final String dbHost;
    private final int dbPort;
    private final String dbName;
    private final String dbUser;
    private final String dbPassword;
    private final String jwtSecret;
    private final String jwtExpiresIn;
    private final List<String> allowedAppOrigins;
    private final String tlsKeyStore;
    private final String tlsKeyStorePassword;
    private final String tlsKeyStoreType;
    private final String tlsKeyAlias;
    private final String entraIssuer;
    private final String entraAudience;
    private final String sharePointTenantId;
    private final String sharePointClientId;
    private final String sharePointClientSecret;
    private final String sharePointDriveId;
    private final String sharePointHtmlFolder;
    private final String sharePointBackupFolder;

    public HubSettings() {
        appEnv = env("APP_ENV", "development");
        databaseProvider = env("DATABASE_PROVIDER", "sqlserver");
        port = integer("PORT", 3000);
        dbHost = env("DB_HOST", "localhost");
        dbPort = integer("DB_PORT", 1433);
        dbName = env("DB_NAME", "hub8");
        dbUser = env("DB_USER", "sa");
        dbPassword = env("DB_PASSWORD", "changeme");
        jwtSecret = env("JWT_SECRET", "dev-only-change-me");
        jwtExpiresIn = env("JWT_EXPIRES_IN", "8h");
        allowedAppOrigins = Arrays.stream(env("ALLOWED_APP_ORIGINS", "").split(","))
                .map(String::trim).filter(StringUtils::hasText).toList();
        tlsKeyStore = env("SERVER_SSL_KEY_STORE", "");
        tlsKeyStorePassword = env("SERVER_SSL_KEY_STORE_PASSWORD", "");
        tlsKeyStoreType = env("SERVER_SSL_KEY_STORE_TYPE", "PKCS12");
        tlsKeyAlias = env("SERVER_SSL_KEY_ALIAS", "");
        entraIssuer = env("ENTRA_ISSUER", "");
        entraAudience = env("ENTRA_AUDIENCE", "");
        sharePointTenantId = env("SHAREPOINT_TENANT_ID", "");
        sharePointClientId = env("SHAREPOINT_CLIENT_ID", "");
        sharePointClientSecret = env("SHAREPOINT_CLIENT_SECRET", "");
        sharePointDriveId = env("SHAREPOINT_DRIVE_ID", "");
        sharePointHtmlFolder = env("SHAREPOINT_HTML_FOLDER", "HUB8/html");
        sharePointBackupFolder = env("SHAREPOINT_BACKUP_FOLDER", "HUB8/backups");
        validate();
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null ? fallback : value;
    }

    private static int integer(String name, int fallback) {
        String value = System.getenv(name);
        if (value == null) return fallback;
        try { return Integer.parseInt(value); }
        catch (NumberFormatException ex) { throw new IllegalStateException(name + " deve ser numérico."); }
    }

    private void validate() {
        if (!List.of("development", "test", "production").contains(appEnv))
            throw new IllegalStateException("APP_ENV deve ser development, test ou production.");
        if (!"sqlserver".equals(databaseProvider))
            throw new IllegalStateException("DATABASE_PROVIDER deve ser sqlserver.");
        if (port < 1 || port > 65535) throw new IllegalStateException("PORT deve estar entre 1 e 65535.");
        if (dbPort < 1 || dbPort > 65535) throw new IllegalStateException("DB_PORT deve estar entre 1 e 65535.");
        validateEntraSettings();
        validateSharePointSettings();
        for (String origin : allowedAppOrigins) {
            try {
                URI uri = URI.create(origin);
                String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
                int portNumber = uri.getPort();
                String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
                boolean defaultPort = portNumber == -1 || scheme.equals("https") && portNumber == 443
                        || scheme.equals("http") && portNumber == 80;
                String normalizedOrigin = scheme + "://" + host
                        + (defaultPort ? "" : ":" + portNumber);
                if (!List.of("http", "https").contains(scheme) || host.isEmpty() || uri.getUserInfo() != null
                        || uri.getRawPath() != null && !uri.getRawPath().isEmpty()
                        || uri.getQuery() != null || uri.getFragment() != null || !normalizedOrigin.equals(origin)
                        || appEnv.equals("production") && !scheme.equals("https"))
                    throw new IllegalArgumentException();
            } catch (IllegalArgumentException ex) {
                throw new IllegalStateException("Origem inválida em ALLOWED_APP_ORIGINS.");
            }
        }
        if (appEnv.equals("production")) {
            for (String name : List.of("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"))
                if (!StringUtils.hasText(System.getenv(name)))
                    throw new IllegalStateException(name + " precisa estar configurada em produção.");
            if (jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32 || jwtSecret.chars().distinct().count() < 12
                    || List.of("dev-only-change-me", "troque-isto-por-um-segredo-forte-de-32+chars").contains(jwtSecret))
                throw new IllegalStateException("JWT_SECRET precisa ter pelo menos 32 bytes e ser forte em produção.");
            if (List.of("changeme", "password", "sa").contains(dbPassword.toLowerCase(Locale.ROOT)))
                throw new IllegalStateException("DB_PASSWORD ainda contém uma senha padrão.");
            if (allowedAppOrigins.isEmpty()) throw new IllegalStateException("Configure ALLOWED_APP_ORIGINS com origens HTTPS.");
            if (!StringUtils.hasText(tlsKeyStore) || !StringUtils.hasText(tlsKeyStorePassword))
                throw new IllegalStateException("Configure SERVER_SSL_KEY_STORE e SERVER_SSL_KEY_STORE_PASSWORD para HTTPS em produção.");
        }
        parseExpiry(jwtExpiresIn);
    }

    private void validateEntraSettings() {
        if (entraIssuer.isBlank() && entraAudience.isBlank()) return;
        if (entraIssuer.isBlank() || entraAudience.isBlank())
            throw new IllegalStateException("Configure ENTRA_ISSUER e ENTRA_AUDIENCE juntos.");
        try {
            URI issuer = URI.create(entraIssuer);
            if (!"https".equals(issuer.getScheme()) || !"login.microsoftonline.com".equalsIgnoreCase(issuer.getHost())
                    || issuer.getRawPath() == null || !issuer.getRawPath().matches("^/[^/]+/v2\\.0$")
                    || issuer.getRawQuery() != null || issuer.getFragment() != null)
                throw new IllegalArgumentException();
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("ENTRA_ISSUER deve ser https://login.microsoftonline.com/{tenant-id}/v2.0.");
        }
    }

    private void validateSharePointSettings() {
        boolean configured = List.of(sharePointTenantId, sharePointClientId, sharePointClientSecret, sharePointDriveId)
                .stream().anyMatch(StringUtils::hasText);
        if (!configured) return;
        if (List.of(sharePointTenantId, sharePointClientId, sharePointClientSecret, sharePointDriveId)
                .stream().anyMatch(value -> !StringUtils.hasText(value)))
            throw new IllegalStateException("Configure todas as variáveis SHAREPOINT_* de tenant, app, segredo e drive.");
        if (!safeSharePointFolder(sharePointHtmlFolder) || !safeSharePointFolder(sharePointBackupFolder))
            throw new IllegalStateException("As pastas SharePoint devem ser caminhos relativos sem segmentos '..'.");
    }

    private static boolean safeSharePointFolder(String folder) {
        return StringUtils.hasText(folder) && !folder.startsWith("/") && !folder.endsWith("/")
                && java.util.Arrays.stream(folder.split("/")).noneMatch(segment ->
                segment.isBlank() || segment.equals(".") || segment.equals(".."));
    }

    public static Duration parseExpiry(String value) {
        var matcher = java.util.regex.Pattern.compile("^\\s*(\\d+(?:\\.\\d+)?)\\s*(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?\\s*$",
                java.util.regex.Pattern.CASE_INSENSITIVE).matcher(value);
        if (!matcher.matches()) throw new IllegalStateException("JWT_EXPIRES_IN deve ser uma duração válida (ex.: 8h).");
        double amount = Double.parseDouble(matcher.group(1));
        String unit = matcher.group(2) == null ? "ms" : matcher.group(2).toLowerCase(Locale.ROOT);
        double millis = switch (unit) {
            case "ms", "millisecond", "milliseconds", "msec", "msecs" -> amount;
            case "s", "sec", "secs", "second", "seconds" -> amount * 1_000;
            case "m", "min", "mins", "minute", "minutes" -> amount * 60_000;
            case "h", "hr", "hrs", "hour", "hours" -> amount * 3_600_000;
            case "d", "day", "days" -> amount * 86_400_000;
            case "w", "week", "weeks" -> amount * 604_800_000;
            default -> amount * 31_557_600_000d;
        };
        if (!Double.isFinite(millis) || millis > Long.MAX_VALUE) throw new IllegalStateException("JWT_EXPIRES_IN está fora do intervalo permitido.");
        return Duration.ofMillis((long) millis);
    }

    public String getAppEnv() { return appEnv; }
    public int getPort() { return port; }
    public String getDatabaseProvider() { return databaseProvider; }
    public String getDbHost() { return dbHost; }
    public int getDbPort() { return dbPort; }
    public String getDbName() { return dbName; }
    public String getDbUser() { return dbUser; }
    public String getDbPassword() { return dbPassword; }
    public String getJwtSecret() { return jwtSecret; }
    public String getJwtExpiresIn() { return jwtExpiresIn; }
    public List<String> getAllowedAppOrigins() { return allowedAppOrigins; }
    public String getTlsKeyStore() { return tlsKeyStore; }
    public String getTlsKeyStorePassword() { return tlsKeyStorePassword; }
    public String getTlsKeyStoreType() { return tlsKeyStoreType; }
    public String getTlsKeyAlias() { return tlsKeyAlias; }
    public String getEntraIssuer() { return entraIssuer; }
    public String getEntraAudience() { return entraAudience; }
    public String getSharePointTenantId() { return sharePointTenantId; }
    public String getSharePointClientId() { return sharePointClientId; }
    public String getSharePointClientSecret() { return sharePointClientSecret; }
    public String getSharePointDriveId() { return sharePointDriveId; }
    public String getSharePointHtmlFolder() { return sharePointHtmlFolder; }
    public String getSharePointBackupFolder() { return sharePointBackupFolder; }
    public boolean isSharePointConfigured() {
        return List.of(sharePointTenantId, sharePointClientId, sharePointClientSecret, sharePointDriveId)
                .stream().allMatch(StringUtils::hasText);
    }
    public boolean isProduction() { return "production".equals(appEnv); }
}
