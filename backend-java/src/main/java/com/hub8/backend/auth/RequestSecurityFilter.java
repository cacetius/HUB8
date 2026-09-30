package com.hub8.backend.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.api.ApiResponses;
import com.hub8.backend.api.RequestBodyTooLargeException;
import com.hub8.backend.config.HubSettings;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RequestSecurityFilter extends OncePerRequestFilter {
    private static final long MAX_BODY = 2L * 1024 * 1024;
    private final JdbcTemplate jdbc;
    private final JwtTokens tokens;
    private final HubSettings settings;
    private final ObjectMapper mapper;
    private final Map<String, Window> rate = new ConcurrentHashMap<>();

    public RequestSecurityFilter(JdbcTemplate jdbc, JwtTokens tokens, HubSettings settings, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.tokens = tokens;
        this.settings = settings;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        headers(response);
        if (!request.getRequestURI().startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }
        if (!cors(request, response)) {
            writeError(response, 403, "FORBIDDEN", "Origem não permitida.");
            return;
        }
        if (request.getMethod().equals("OPTIONS")) {
            response.setStatus(204);
            return;
        }
        if (settings.isProduction() && request.getScheme().equalsIgnoreCase("http")) {
            writeError(response, 400, "HTTPS_REQUIRED", "HTTPS é obrigatório.");
            return;
        }
        Window currentWindow = rateWindow(request.getRemoteAddr());
        response.setHeader("RateLimit-Policy", "300;w=60");
        response.setHeader("RateLimit", "limit=300, remaining=" + Math.max(0, 300 - currentWindow.count)
                + ", reset=" + Math.max(0, (currentWindow.start + 60_000 - System.currentTimeMillis()) / 1000));
        if (currentWindow.count > 300) {
            writeError(response, 429, "RATE_LIMITED", "Limite de requisições excedido.");
            return;
        }
        if (request.getContentLengthLong() > MAX_BODY) {
            writeError(response, 413, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede 2 MB.");
            return;
        }
        if (isLogin(request)) {
            try {
                chain.doFilter(new LimitedBodyRequest(request), response);
            } catch (RequestBodyTooLargeException ex) {
                writeError(response, 413, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede 2 MB.");
            }
            return;
        }
        try {
            String authorization = request.getHeader("Authorization");
            if (authorization == null || !authorization.startsWith("Bearer "))
                throw ApiException.unauthenticated("Não autenticado.");
            Map<String, Object> claims = tokens.verify(authorization.substring(7));
            if (!(claims.get("id") instanceof Number tokenId))
                throw ApiException.expired("Sessão inválida ou expirada.");
            long id = tokenId.longValue();
            List<Map<String, Object>> users = jdbc.queryForList(
                    "SELECT ID, USERNAME, DISPLAY_NAME FROM USERS WHERE ID = ? AND ACTIVE = 1", id);
            if (users.size() != 1) throw ApiException.expired("Conta inexistente ou desativada.");
            List<String> roles = jdbc.query("SELECT R.CODE FROM ROLES R JOIN USER_ROLES UR ON UR.ROLE_ID = R.ID WHERE UR.USER_ID = ? AND R.ACTIVE = 1",
                    (rs, row) -> rs.getString(1), id);
            List<String> permissions = jdbc.query("SELECT DISTINCT P.CODE FROM PERMISSIONS P JOIN ROLE_PERMISSIONS RP ON RP.PERMISSION_ID = P.ID JOIN USER_ROLES UR ON UR.ROLE_ID = RP.ROLE_ID JOIN ROLES R ON R.ID = UR.ROLE_ID AND R.ACTIVE = 1 WHERE UR.USER_ID = ?",
                    (rs, row) -> rs.getString(1), id);
            Map<String, Object> user = users.get(0);
            HubPrincipal principal = new HubPrincipal(id, (String) user.get("USERNAME"), (String) user.get("DISPLAY_NAME"),
                    List.copyOf(roles), List.copyOf(permissions));
            String required = permission(request.getRequestURI(), request.getMethod());
            if (required != null && !principal.permissions().contains(required)) throw ApiException.forbidden();
            request.setAttribute("hubPrincipal", principal);
            chain.doFilter(new LimitedBodyRequest(request), response);
        } catch (ApiException ex) {
            writeError(response, ex.getStatus(), ex.getCode(), ex.getMessage());
        } catch (RequestBodyTooLargeException ex) {
            writeError(response, 413, "PAYLOAD_TOO_LARGE", "Corpo da requisição excede 2 MB.");
        } catch (Exception ex) {
            logger.error("Falha de autenticação/autorização", ex);
            writeError(response, 500, "INTERNAL_ERROR", "Erro interno do servidor.");
        }
    }

    private boolean isLogin(HttpServletRequest req) {
        return req.getMethod().equals("POST") && req.getRequestURI().equals("/api/v1/auth/login");
    }

    private String permission(String path, String method) {
        if (path.startsWith("/api/v1/auth/")) return null;
        if (path.equals("/api/v1/dashboard/summary")) return "reports.view";
        if (path.equals("/api/v1/users") || path.startsWith("/api/v1/users/")) return "users.manage";
        if (path.equals("/api/v1/audit") || path.startsWith("/api/v1/audit/")) return "audit.view";
        if (path.equals("/api/v1/apps") || path.startsWith("/api/v1/apps/"))
            return switch (method) { case "GET" -> "apps.view"; case "POST" -> path.endsWith("/restore") ? "apps.delete" : path.equals("/api/v1/apps") ? "apps.create" : null;
                case "PUT" -> "apps.edit"; case "DELETE" -> "apps.delete"; default -> null; };
        if (path.equals("/api/v1/operators") || path.startsWith("/api/v1/operators/"))
            return catalogPermission("operators", method, path);
        if (path.equals("/api/v1/operations") || path.startsWith("/api/v1/operations/"))
            return catalogPermission("operations", method, path);
        if (path.equals("/api/v1/shifts") || path.startsWith("/api/v1/shifts/"))
            return "shifts.manage";
        return null;
    }

    private String catalogPermission(String resource, String method, String path) {
        if (method.equals("POST") && path.endsWith("/restore")) return resource + ".delete";
        String verb = switch (method) { case "GET" -> "view"; case "POST" -> "create"; case "PUT" -> "edit"; case "DELETE" -> "delete"; default -> null; };
        return verb == null ? null : resource + "." + verb;
    }

    private void headers(HttpServletResponse response) {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("X-XSS-Protection", "0");
        if (settings.isProduction()) response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    private boolean cors(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (origin == null) return true;
        if (!settings.isProduction()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        } else if (settings.getAllowedAppOrigins().contains(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        } else return false;
        response.setHeader("Vary", "Origin");
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
        response.setHeader("Access-Control-Max-Age", "600");
        return true;
    }

    private Window rateWindow(String ip) {
        long now = System.currentTimeMillis();
        Window window = rate.compute(ip, (key, current) -> current == null || now - current.start >= 60_000
                ? new Window(now, 1) : new Window(current.start, current.count + 1));
        rate.entrySet().removeIf(entry -> now - entry.getValue().start > 120_000);
        return window;
    }

    private void writeError(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), ApiResponses.errorBody(message, code));
    }

    private record Window(long start, int count) {}

    private static final class LimitedBodyRequest extends HttpServletRequestWrapper {
        private LimitedBodyStream stream;

        private LimitedBodyRequest(HttpServletRequest request) { super(request); }

        @Override
        public ServletInputStream getInputStream() throws IOException {
            if (stream == null) stream = new LimitedBodyStream(super.getInputStream());
            return stream;
        }

        @Override
        public BufferedReader getReader() throws IOException {
            String encoding = getCharacterEncoding() == null ? "UTF-8" : getCharacterEncoding();
            return new BufferedReader(new InputStreamReader(getInputStream(), encoding));
        }
    }

    private static final class LimitedBodyStream extends ServletInputStream {
        private final ServletInputStream source;
        private long consumed;

        private LimitedBodyStream(ServletInputStream source) { this.source = source; }

        @Override
        public int read() throws IOException {
            if (consumed == MAX_BODY) {
                if (source.read() == -1) return -1;
                throw new RequestBodyTooLargeException();
            }
            int value = source.read();
            if (value != -1) consumed++;
            return value;
        }

        @Override
        public int read(byte[] bytes, int offset, int length) throws IOException {
            if (length == 0) return 0;
            if (consumed == MAX_BODY) {
                if (source.read() == -1) return -1;
                throw new RequestBodyTooLargeException();
            }
            int limited = (int) Math.min(length, MAX_BODY - consumed);
            int count = source.read(bytes, offset, limited);
            if (count > 0) consumed += count;
            return count;
        }

        @Override public boolean isFinished() { return source.isFinished(); }
        @Override public boolean isReady() { return source.isReady(); }
        @Override public void setReadListener(ReadListener listener) { source.setReadListener(listener); }
    }
}
