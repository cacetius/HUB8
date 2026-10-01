package com.hub8.backend.api;

import com.hub8.backend.auth.HubPrincipal;
import com.hub8.backend.persistence.SharePointFileStore;
import com.hub8.backend.service.HubService;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping
public class HubApiController {
    private final HubService service;
    private final SharePointFileStore files;
    private final ObjectMapper mapper;
    public HubApiController(HubService service, SharePointFileStore files, ObjectMapper mapper) {
        this.service = service;
        this.files = files;
        this.mapper = mapper;
    }

    @GetMapping("/health")
    public Map<String, Object> health() { return Map.of("status", "ok"); }

    @GetMapping("/ready")
    public ResponseEntity<Map<String, Object>> ready() {
        return service.ready() ? ResponseEntity.ok(Map.of("status", "ok"))
                : ResponseEntity.status(503).body(Map.of("status", "unavailable"));
    }

    @PostMapping("/api/v1/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody(required = false) Object body,
                                                      HttpServletRequest request) {
        return ApiResponses.ok(service.login(loginBody(body), request.getRemoteAddr(), request.getHeader("User-Agent")));
    }

    @PostMapping("/api/v1/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
        service.logout(principal(request), request.getRemoteAddr(), request.getHeader("User-Agent"));
        return ApiResponses.ok(Map.of("loggedOut", true));
    }

    @GetMapping("/api/v1/auth/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        return ApiResponses.ok(service.me(principal(request)));
    }

    @GetMapping("/api/v1/apps")
    public ResponseEntity<Map<String, Object>> apps(@RequestParam(required = false) String page,
            @RequestParam(required = false) String pageSize, @RequestParam(required = false) String search) {
        int[] pagination = pagination(page, pageSize);
        return ApiResponses.ok(service.listApps(pagination[0], pagination[1], search));
    }

    @GetMapping("/api/v1/apps/{id}")
    public ResponseEntity<Map<String, Object>> app(@PathVariable String id) {
        return ApiResponses.ok(service.getApp(id(id, "id")));
    }

    @PostMapping("/api/v1/apps")
    public ResponseEntity<Map<String, Object>> createApp(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        return ApiResponses.created(service.createApp(objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @PutMapping("/api/v1/apps/{id}")
    public ResponseEntity<Map<String, Object>> updateApp(@PathVariable String id,
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        return ApiResponses.ok(service.updateApp(id(id, "id"), objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @DeleteMapping("/api/v1/apps/{id}")
    public ResponseEntity<Map<String, Object>> deleteApp(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.deleteApp(id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @PostMapping("/api/v1/apps/{id}/restore")
    public ResponseEntity<Map<String, Object>> restoreApp(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.restoreApp(id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @GetMapping("/api/v1/operators")
    public ResponseEntity<Map<String, Object>> operators(@RequestParam(required = false) String page,
            @RequestParam(required = false) String pageSize, @RequestParam(required = false) String search) {
        int[] p = pagination(page, pageSize);
        return ApiResponses.ok(service.listCatalog("operators", p[0], p[1], search));
    }

    @GetMapping("/api/v1/operators/{id}")
    public ResponseEntity<Map<String, Object>> operator(@PathVariable String id) {
        return ApiResponses.ok(service.getCatalog("operators", id(id, "id")));
    }

    @PostMapping("/api/v1/operators")
    public ResponseEntity<Map<String, Object>> createOperator(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        return ApiResponses.created(service.createCatalog("operators", objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @PutMapping("/api/v1/operators/{id}")
    public ResponseEntity<Map<String, Object>> updateOperator(@PathVariable String id,
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        return ApiResponses.ok(service.updateCatalog("operators", id(id, "id"), objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @DeleteMapping("/api/v1/operators/{id}")
    public ResponseEntity<Map<String, Object>> deleteOperator(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.deleteCatalog("operators", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @PostMapping("/api/v1/operators/{id}/restore")
    public ResponseEntity<Map<String, Object>> restoreOperator(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.restoreCatalog("operators", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @GetMapping("/api/v1/operations")
    public ResponseEntity<Map<String, Object>> operations(@RequestParam(required = false) String page,
            @RequestParam(required = false) String pageSize, @RequestParam(required = false) String search) {
        int[] p = pagination(page, pageSize);
        return ApiResponses.ok(service.listCatalog("operations", p[0], p[1], search));
    }

    @GetMapping("/api/v1/operations/{id}")
    public ResponseEntity<Map<String, Object>> operation(@PathVariable String id) {
        return ApiResponses.ok(service.getCatalog("operations", id(id, "id")));
    }

    @PostMapping("/api/v1/operations")
    public ResponseEntity<Map<String, Object>> createOperation(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        return ApiResponses.created(service.createCatalog("operations", objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @PutMapping("/api/v1/operations/{id}")
    public ResponseEntity<Map<String, Object>> updateOperation(@PathVariable String id,
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        return ApiResponses.ok(service.updateCatalog("operations", id(id, "id"), objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @DeleteMapping("/api/v1/operations/{id}")
    public ResponseEntity<Map<String, Object>> deleteOperation(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.deleteCatalog("operations", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @PostMapping("/api/v1/operations/{id}/restore")
    public ResponseEntity<Map<String, Object>> restoreOperation(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.restoreCatalog("operations", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @GetMapping("/api/v1/shifts")
    public ResponseEntity<Map<String, Object>> shifts(@RequestParam(required = false) String page,
            @RequestParam(required = false) String pageSize) {
        int[] p = pagination(page, pageSize);
        return ApiResponses.ok(service.listCatalog("shifts", p[0], p[1], null));
    }

    @GetMapping("/api/v1/shifts/current")
    public ResponseEntity<Map<String, Object>> currentShift() { return ApiResponses.ok(service.currentShift()); }

    @GetMapping("/api/v1/shifts/{id}")
    public ResponseEntity<Map<String, Object>> shift(@PathVariable String id) {
        return ApiResponses.ok(service.getCatalog("shifts", id(id, "id")));
    }

    @PostMapping("/api/v1/shifts")
    public ResponseEntity<Map<String, Object>> createShift(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        return ApiResponses.created(service.createCatalog("shifts", objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @PutMapping("/api/v1/shifts/{id}")
    public ResponseEntity<Map<String, Object>> updateShift(@PathVariable String id,
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        return ApiResponses.ok(service.updateCatalog("shifts", id(id, "id"), objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @DeleteMapping("/api/v1/shifts/{id}")
    public ResponseEntity<Map<String, Object>> deleteShift(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.deleteCatalog("shifts", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @PostMapping("/api/v1/shifts/{id}/restore")
    public ResponseEntity<Map<String, Object>> restoreShift(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.restoreCatalog("shifts", id(id, "id"), principal(request), request.getRemoteAddr()));
    }

    @GetMapping("/api/v1/dashboard/summary")
    public ResponseEntity<Map<String, Object>> dashboard() { return ApiResponses.ok(service.dashboard()); }

    @GetMapping("/api/v1/audit")
    public ResponseEntity<Map<String, Object>> audit(@RequestParam Map<String, String> query) {
        int[] p = pagination(query.get("page"), query.get("pageSize"));
        Map<String, String> filters = new LinkedHashMap<>(query);
        filters.remove("page"); filters.remove("pageSize");
        return ApiResponses.ok(service.listAudit(filters, p[0], p[1]));
    }

    @GetMapping("/api/v1/audit/entity/{entity}/{entityId}")
    public ResponseEntity<Map<String, Object>> auditByEntity(@PathVariable String entity, @PathVariable String entityId,
            @RequestParam(required = false) String page, @RequestParam(required = false) String pageSize) {
        int[] p = pagination(page, pageSize);
        return ApiResponses.ok(service.auditByEntity(entity, entityId, p[0], p[1]));
    }

    @GetMapping("/api/v1/audit/{id}")
    public ResponseEntity<Map<String, Object>> auditRecord(@PathVariable String id) {
        return ApiResponses.ok(service.getAudit(id(id, "id")));
    }

    @GetMapping("/api/v1/users")
    public ResponseEntity<Map<String, Object>> users(@RequestParam(required = false) String page,
            @RequestParam(required = false) String pageSize, @RequestParam(required = false) String search) {
        int[] p = pagination(page, pageSize);
        return ApiResponses.ok(service.listUsers(p[0], p[1], search));
    }

    @GetMapping("/api/v1/users/roles")
    public ResponseEntity<Map<String, Object>> roles() { return ApiResponses.ok(service.listRoles()); }

    @GetMapping("/api/v1/users/{id}")
    public ResponseEntity<Map<String, Object>> user(@PathVariable String id) {
        return ApiResponses.ok(service.getUser(id(id, "id")));
    }

    @PostMapping("/api/v1/files/html")
    public ResponseEntity<Map<String, Object>> uploadHtml(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        Map<String, Object> input = objectBody(body);
        String fileName = fileName(input.get("fileName"), ".html");
        String html = requiredText(input.get("content"), "content");
        byte[] content = html.getBytes(StandardCharsets.UTF_8);
        if (content.length > 3 * 1024 * 1024)
            throw ApiException.validation("O HTML não pode exceder 3 MB.");
        String normalized = html.stripLeading().toLowerCase(java.util.Locale.ROOT);
        if (!(normalized.startsWith("<!doctype html") || normalized.startsWith("<html") || normalized.startsWith("<head")
                || normalized.startsWith("<body")))
            throw ApiException.validation("O arquivo precisa conter um documento HTML.");
        Map<String, Object> stored = files.uploadHtml(fileName, content);
        service.recordFileAction(principal(request), "UPLOAD", String.valueOf(stored.get("id")),
                Map.of("name", stored.get("name"), "size", stored.get("size")), request.getRemoteAddr());
        return ApiResponses.created(stored);
    }

    @GetMapping("/api/v1/files/html")
    public ResponseEntity<Map<String, Object>> listHtmlFiles() {
        return ApiResponses.ok(files.listHtml());
    }

    @GetMapping("/api/v1/files/html/{id}")
    public ResponseEntity<Map<String, Object>> downloadHtml(@PathVariable String id, HttpServletRequest request) {
        SharePointFileStore.StoredFile stored = files.downloadHtml(id);
        String content = new String(stored.content(), StandardCharsets.UTF_8);
        service.recordFileAction(principal(request), "DOWNLOAD", id,
                Map.of("size", stored.content().length), request.getRemoteAddr());
        return ApiResponses.ok(Map.of("id", id, "contentType", stored.contentType(), "content", content));
    }

    @PostMapping("/api/v1/files/legacy-backups")
    public ResponseEntity<Map<String, Object>> saveLegacyBackup(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        Map<String, Object> input = objectBody(body);
        Object rawData = input.get("data");
        if (!(rawData instanceof Map<?, ?> data) || !(data.get("config") instanceof Map<?, ?>)
                || !(data.get("apps") instanceof List<?>))
            throw ApiException.validation("Backup inválido: são necessários os campos config e apps.");
        byte[] content;
        try {
            content = mapper.writeValueAsBytes(rawData);
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw ApiException.validation("Não foi possível serializar o backup.");
        }
        if (content.length > 8 * 1024 * 1024)
            throw ApiException.validation("O backup não pode exceder 8 MB.");
        String name = "fahrwerk_hub_" + java.time.Instant.now().toString().replace(':', '-') + ".json";
        Map<String, Object> stored = files.uploadBackup(name, content);
        service.recordFileAction(principal(request), "BACKUP_UPLOAD", String.valueOf(stored.get("id")),
                Map.of("name", stored.get("name"), "size", stored.get("size")), request.getRemoteAddr());
        return ApiResponses.created(stored);
    }

    @GetMapping("/api/v1/files/legacy-backups")
    public ResponseEntity<Map<String, Object>> listLegacyBackups() {
        return ApiResponses.ok(files.listBackups());
    }

    @GetMapping("/api/v1/files/legacy-backups/{id}")
    public ResponseEntity<Map<String, Object>> restoreLegacyBackup(@PathVariable String id,
            HttpServletRequest request) {
        SharePointFileStore.StoredFile stored = files.downloadBackup(id);
        Map<String, Object> backup;
        try {
            backup = mapper.readValue(stored.content(), new TypeReference<>() {});
        } catch (java.io.IOException ex) {
            throw ApiException.validation("O arquivo selecionado não contém um backup JSON válido.");
        }
        if (!(backup.get("config") instanceof Map<?, ?>) || !(backup.get("apps") instanceof List<?>))
            throw ApiException.validation("Backup inválido: são necessários os campos config e apps.");
        service.recordFileAction(principal(request), "BACKUP_DOWNLOAD", id,
                Map.of("size", stored.content().length), request.getRemoteAddr());
        return ApiResponses.ok(Map.of("id", id, "data", backup));
    }

    @PostMapping("/api/v1/users")
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody(required = false) Object body,
            HttpServletRequest request) {
        return ApiResponses.created(service.createUser(objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @PutMapping("/api/v1/users/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable String id,
            @RequestBody(required = false) Object body, HttpServletRequest request) {
        return ApiResponses.ok(service.updateUser(id(id, "id"), objectBody(body), principal(request), request.getRemoteAddr()));
    }

    @DeleteMapping("/api/v1/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.setUserActive(id(id, "id"), false, principal(request), request.getRemoteAddr()));
    }

    @PostMapping("/api/v1/users/{id}/restore")
    public ResponseEntity<Map<String, Object>> restoreUser(@PathVariable String id, HttpServletRequest request) {
        return ApiResponses.ok(service.setUserActive(id(id, "id"), true, principal(request), request.getRemoteAddr()));
    }

    private static HubPrincipal principal(HttpServletRequest request) {
        Object principal = request.getAttribute("hubPrincipal");
        if (!(principal instanceof HubPrincipal user)) throw ApiException.unauthenticated("Não autenticado.");
        return user;
    }

    private static Map<String, Object> objectBody(Object body) {
        if (!(body instanceof Map<?, ?> raw)) throw ApiException.validation("O corpo da requisição deve ser um objeto.");
        Map<String, Object> values = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            if (!(key instanceof String name)) throw ApiException.validation("O corpo da requisição deve ser um objeto.");
            values.put(name, value);
        });
        return values;
    }

    private static String requiredText(Object value, String field) {
        if (!(value instanceof String text) || text.isBlank())
            throw ApiException.validation(field + " é obrigatório.");
        return text;
    }

    private static String fileName(Object value, String extension) {
        String name = requiredText(value, "fileName").trim();
        if (name.length() > 120 || name.contains("/") || name.contains("\\")
                || !name.toLowerCase(java.util.Locale.ROOT).endsWith(extension)
                || !name.matches("[A-Za-z0-9 _.-]+"))
            throw ApiException.validation("Nome de arquivo inválido.");
        return name;
    }

    private static Map<String, Object> loginBody(Object body) {
        if (!(body instanceof Map<?, ?> raw)) return null;
        Map<String, Object> values = new LinkedHashMap<>();
        raw.forEach((key, value) -> {
            if (key instanceof String name) values.put(name, value);
        });
        return values;
    }

    private static int[] pagination(String rawPage, String rawSize) {
        long page = positive(rawPage, "page", 1);
        long size = positive(rawSize, "pageSize", 20);
        if (size > 100) throw ApiException.validation("pageSize não pode ser maior que 100.");
        if (page > 9_007_199_254_740_991L || size > 9_007_199_254_740_991L)
            throw ApiException.validation("page está fora do intervalo permitido.");
        if (page > Integer.MAX_VALUE || size > Integer.MAX_VALUE)
            throw ApiException.validation("page está fora do intervalo permitido.");
        return new int[]{(int) page, (int) size};
    }

    private static long id(String value, String name) { return positive(value, name, -1); }

    private static long positive(String value, String name, long defaultValue) {
        if (value == null && defaultValue > 0) return defaultValue;
        if (value == null || !value.matches("^[1-9]\\d*$"))
            throw ApiException.validation(name + " deve ser um número inteiro positivo.");
        try {
            long id = Long.parseLong(value);
            if (id > 9_007_199_254_740_991L) throw ApiException.validation(name + " está fora do intervalo permitido.");
            return id;
        }
        catch (NumberFormatException ex) { throw ApiException.validation(name + " está fora do intervalo permitido."); }
    }
}
