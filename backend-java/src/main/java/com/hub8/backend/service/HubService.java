package com.hub8.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.auth.HubPrincipal;
import com.hub8.backend.auth.JwtTokens;
import com.hub8.backend.persistence.AppRepository;
import com.hub8.backend.persistence.AuthRepository;
import com.hub8.backend.persistence.AuditRepository;
import com.hub8.backend.persistence.CatalogRepository;
import com.hub8.backend.persistence.DashboardRepository;
import com.hub8.backend.persistence.UserRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HubService {
    private static final Pattern TIME = Pattern.compile("^(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d{1,7})?)?$");
    private static final Map<String, Catalog> CATALOGS = Map.of(
            "operators", new Catalog("OPERATORS", true, orderedFields(
                    "name", new Field("NAME", "text", true, false, 160),
                    "registration", new Field("REGISTRATION", "text", false, true, 40),
                    "roleLabel", new Field("ROLE_LABEL", "text", false, true, 80),
                    "operationId", new Field("OPERATION_ID", "id", false, true, 0),
                    "status", new Field("STATUS", "text", false, false, 20))),
            "operations", new Catalog("OPERATIONS", true, orderedFields(
                    "name", new Field("NAME", "text", true, false, 160),
                    "description", new Field("DESCRIPTION", "text", false, true, 500))),
            "shifts", new Catalog("SHIFTS", false, orderedFields(
                    "name", new Field("NAME", "text", true, false, 80),
                    "startTime", new Field("START_TIME", "time", true, false, 0),
                    "endTime", new Field("END_TIME", "time", true, false, 0))));
    private static final Map<String, String> APP_FIELDS = orderedFields(
            "name", "NAME", "subtitle", "SUBTITLE", "description", "DESCRIPTION", "category", "CATEGORY",
            "icon", "ICON", "url", "URL", "status", "STATUS", "sortOrder", "SORT_ORDER", "minRoleId", "MIN_ROLE_ID");
    private static final Map<String, Integer> APP_MAX = Map.of("name", 160, "subtitle", 200, "description", 500,
            "category", 60, "icon", 120, "url", 255, "status", 20);
    private final AppRepository apps;
    private final AuthRepository auth;
    private final AuditRepository audits;
    private final CatalogRepository catalogs;
    private final DashboardRepository dashboard;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JwtTokens tokens;
    private final ObjectMapper mapper;

    public HubService(AppRepository apps, AuthRepository auth, AuditRepository audits,
            CatalogRepository catalogs, DashboardRepository dashboard, UserRepository users,
            PasswordEncoder passwords, JwtTokens tokens, ObjectMapper mapper) {
        this.apps = apps;
        this.auth = auth;
        this.audits = audits;
        this.catalogs = catalogs;
        this.dashboard = dashboard;
        this.users = users;
        this.passwords = passwords;
        this.tokens = tokens;
        this.mapper = mapper;
    }

    public Map<String, Object> login(Map<String, Object> body, String ip, String userAgent) {
        Object rawUser = body == null ? null : body.get("username");
        Object rawPassword = body == null ? null : body.get("password");
        if (!(rawUser instanceof String username) || username.trim().isEmpty() || !(rawPassword instanceof String password))
            throw ApiException.validation("Usuário ou senha inválidos.");
        List<Map<String, Object>> rows = auth.findActiveUser(username);
        if (rows.size() != 1 || !passwords.matches(password, String.valueOf(rows.get(0).get("PASSWORD_HASH"))))
            throw ApiException.validation("Usuário ou senha inválidos.");
        Map<String, Object> row = rows.get(0);
        long id = number(row.get("ID"));
        List<String> roles = auth.roles(id);
        List<String> perms = auth.permissions(id);
        String token = tokens.issue(id, (String) row.get("USERNAME"), roles, perms);
        audit(id, "LOGIN", "USERS", id, null, null, ip, userAgent);
        return Map.of("token", token, "user", principal(id, (String) row.get("USERNAME"), (String) row.get("DISPLAY_NAME"), roles, perms).toMap());
    }

    public void logout(HubPrincipal actor, String ip, String agent) {
        audit(actor.id(), "LOGOUT", "USERS", actor.id(), null, null, ip, agent);
    }

    public void recordFileAction(HubPrincipal actor, String action, String fileId, Map<String, Object> details, String ip) {
        audit(actor.id(), action, "SHAREPOINT_FILES", fileId, null, details, ip, null);
    }

    public Map<String, Object> me(HubPrincipal actor) { return actor.toMap(); }

    public boolean ready() { return dashboard.isReady(); }

    public Map<String, Object> listApps(int page, int size, String search) {
        validateSearch(search);
        return apps.list(page, size, search);
    }

    public Map<String, Object> getApp(long id) {
        return required(apps.findActive(id), "Aplicativo não encontrado.");
    }

    @Transactional
    public Map<String, Object> createApp(Map<String, Object> body, HubPrincipal actor, String ip) {
        Map<String, Object> values = normalizeApp(body, true);
        List<String> columns = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        values.forEach((key, value) -> { columns.add(APP_FIELDS.get(key)); args.add(value); });
        columns.addAll(List.of("CREATED_BY", "UPDATED_BY"));
        args.add(actor.id()); args.add(actor.id());
        long id = apps.insert(columns, args);
        audit(actor.id(), "CREATE", "APPS", id, null, values, ip, null);
        return getApp(id);
    }

    @Transactional
    public Map<String, Object> updateApp(long id, Map<String, Object> body, HubPrincipal actor, String ip) {
        Map<String, Object> before = getApp(id);
        Map<String, Object> values = normalizeApp(body, false);
        apps.update(id, values, APP_FIELDS, actor.id());
        audit(actor.id(), "UPDATE", "APPS", id, before, values, ip, null);
        return getApp(id);
    }

    @Transactional
    public Map<String, Object> deleteApp(long id, HubPrincipal actor, String ip) {
        Map<String, Object> before = getApp(id);
        apps.setActive(id, actor.id(), false);
        audit(actor.id(), "DELETE", "APPS", id, before, null, ip, null);
        return Map.of("removed", true);
    }

    @Transactional
    public Map<String, Object> restoreApp(long id, HubPrincipal actor, String ip) {
        Map<String, Object> before = required(apps.findAny(id), "Aplicativo não encontrado.");
        apps.setActive(id, actor.id(), true);
        audit(actor.id(), "RESTORE", "APPS", id, before, null, ip, null);
        return getApp(id);
    }

    public Map<String, Object> listCatalog(String resource, int page, int size, String search) {
        Catalog catalog = catalog(resource);
        validateSearch(search);
        return catalogs.list(catalog.table, page, size, search,
                resource.equals("shifts") ? "START_TIME, NAME" : "NAME");
    }

    public Map<String, Object> getCatalog(String resource, long id) {
        return catalogRecord(resource, id, false);
    }

    public Map<String, Object> currentShift() {
        List<Map<String, Object>> shifts = catalogs.activeShifts();
        LocalTime now = LocalTime.now();
        for (Map<String, Object> shift : shifts) {
            LocalTime start = parseTime(shift.get("START_TIME"));
            LocalTime end = parseTime(shift.get("END_TIME"));
            boolean inside = start.compareTo(end) <= 0
                    ? !now.isBefore(start) && now.isBefore(end)
                    : !now.isBefore(start) || now.isBefore(end);
            if (inside) return shift;
        }
        return null;
    }

    @Transactional
    public Map<String, Object> createCatalog(String resource, Map<String, Object> body, HubPrincipal actor, String ip) {
        Catalog catalog = catalog(resource);
        Map<String, Object> values = normalizeCatalog(resource, body, true);
        validateOperationReference(resource, values);
        List<String> columns = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        values.forEach((key, value) -> { columns.add(catalog.fields.get(key).column); args.add(value); });
        if (catalog.audited) {
            columns.addAll(List.of("CREATED_BY", "UPDATED_BY"));
            args.add(actor.id()); args.add(actor.id());
        }
        long id = catalogs.insert(catalog.table, columns, args);
        if (catalog.audited) audit(actor.id(), "CREATE", catalog.table, id, null, values, ip, null);
        return catalogRecord(resource, id, false);
    }

    @Transactional
    public Map<String, Object> updateCatalog(String resource, long id, Map<String, Object> body, HubPrincipal actor, String ip) {
        Catalog catalog = catalog(resource);
        Map<String, Object> before = catalogRecord(resource, id, false);
        Map<String, Object> values = normalizeCatalog(resource, body, false);
        validateOperationReference(resource, values);
        Map<String, String> columns = new LinkedHashMap<>();
        catalog.fields.forEach((key, field) -> columns.put(key, field.column));
        catalogs.update(catalog.table, id, values, columns, actor.id(), catalog.audited);
        if (catalog.audited) audit(actor.id(), "UPDATE", catalog.table, id, before, values, ip, null);
        return catalogRecord(resource, id, false);
    }

    @Transactional
    public Map<String, Object> deleteCatalog(String resource, long id, HubPrincipal actor, String ip) {
        Catalog catalog = catalog(resource);
        Map<String, Object> before = catalogRecord(resource, id, false);
        catalogs.setActive(catalog.table, id, actor.id(), catalog.audited, false);
        if (catalog.audited) audit(actor.id(), "DELETE", catalog.table, id, before, null, ip, null);
        return Map.of("removed", true);
    }

    @Transactional
    public Map<String, Object> restoreCatalog(String resource, long id, HubPrincipal actor, String ip) {
        Catalog catalog = catalog(resource);
        Map<String, Object> before = catalogRecord(resource, id, true);
        catalogs.setActive(catalog.table, id, actor.id(), catalog.audited, true);
        if (catalog.audited) audit(actor.id(), "RESTORE", catalog.table, id, before, null, ip, null);
        return catalogRecord(resource, id, false);
    }

    public Map<String, Object> dashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("apps", dashboard.countWithStatus("APPS"));
        result.put("operators", dashboard.countWithStatus("OPERATORS"));
        result.put("operations", dashboard.count("OPERATIONS"));
        result.put("shifts", dashboard.count("SHIFTS"));
        return result;
    }

    public Map<String, Object> listAudit(Map<String, String> filters, int page, int size) {
        Set<String> allowed = Set.of("userId", "action", "entity", "entityId", "from", "to");
        for (String key : filters.keySet()) if (!allowed.contains(key)) throw ApiException.validation("Filtro não permitido: " + key + ".");
        Map<String, Object> cleanFilters = new LinkedHashMap<>();
        if (filters.containsKey("userId")) cleanFilters.put("userId", positiveId(filters.get("userId"), "userId"));
        for (String key : List.of("action", "entity", "entityId")) {
            if (filters.containsKey(key)) cleanFilters.put(key, shortText(filters.get(key), key, 60));
        }
        Instant from = date(filters.get("from"), "from");
        Instant to = date(filters.get("to"), "to");
        if (from != null && to != null && from.isAfter(to)) throw ApiException.validation("from não pode ser posterior a to.");
        if (from != null) cleanFilters.put("from", Timestamp.from(from));
        if (to != null) cleanFilters.put("to", Timestamp.from(to));
        return audits.list(cleanFilters, page, size);
    }

    public Map<String, Object> auditByEntity(String entity, String entityId, int page, int size) {
        String cleanEntity = shortText(entity, "entity", 60);
        String cleanId = shortText(entityId, "entityId", 60);
        return audits.listByEntity(cleanEntity, cleanId, page, size);
    }

    public Map<String, Object> getAudit(long id) {
        return required(audits.find(id), "Registro de auditoria não encontrado.");
    }

    public List<Map<String, Object>> listRoles() {
        return users.listRoles();
    }

    public Map<String, Object> listUsers(int page, int size, String search) {
        validateSearch(search);
        Map<String, Object> result = users.list(page, size, search);
        @SuppressWarnings("unchecked") List<Map<String, Object>> rows = (List<Map<String, Object>>) result.get("rows");
        for (Map<String, Object> row : rows) row.put("roles", users.roles(number(row.get("ID"))));
        return result;
    }

    public Map<String, Object> getUser(long id) {
        List<Map<String, Object>> rows = users.find(id);
        if (rows.isEmpty()) throw ApiException.validation("Usuário não encontrado.");
        Map<String, Object> user = new LinkedHashMap<>(rows.get(0));
        user.put("roles", users.roles(id));
        return user;
    }

    @Transactional
    public Map<String, Object> createUser(Map<String, Object> body, HubPrincipal actor, String ip) {
        Map<String, Object> values = normalizeUser(body, true);
        String username = (String) values.get("username");
        if (users.usernameExists(username))
            throw ApiException.validation("Esse nome de usuário já está em uso.");
        List<Long> roleIds = resolveRoles(codes(values.get("roleCodes")));
        int active = Boolean.FALSE.equals(values.get("active")) ? 0 : 1;
        long id = users.insert(username, values.get("email"), passwords.encode((String) values.get("password")),
                values.get("displayName"), active, actor.id(), roleIds);
        Map<String, Object> user = getUser(id);
        audit(actor.id(), "CREATE", "USERS", id, null, user, ip, null);
        return user;
    }

    @Transactional
    public Map<String, Object> updateUser(long id, Map<String, Object> body, HubPrincipal actor, String ip) {
        Map<String, Object> before = getUser(id);
        Map<String, Object> values = normalizeUser(body, false);
        if (values.containsKey("username") && !values.get("username").equals(before.get("USERNAME"))
                && users.usernameExistsForOtherUser((String) values.get("username"), id))
            throw ApiException.validation("Esse nome de usuário já está em uso.");
        if (id == actor.id() && Boolean.FALSE.equals(values.get("active"))) throw ApiException.validation("Não é possível desativar a própria conta.");
        if (id == actor.id() && values.containsKey("roleCodes") && !codes(values.get("roleCodes")).contains("ADMIN"))
            throw ApiException.validation("Não é possível remover a função ADMIN da própria conta.");
        List<Map<String, Object>> existing = users.findActiveState(id);
        boolean wasActive = truth(existing.get(0).get("ACTIVE"));
        List<String> currentRoles = users.roles(id);
        List<String> nextRoles = values.containsKey("roleCodes") ? codes(values.get("roleCodes")) : currentRoles;
        boolean nextActive = values.containsKey("active") ? Boolean.TRUE.equals(values.get("active")) : wasActive;
        if (currentRoles.contains("ADMIN") && wasActive && (!nextActive || !nextRoles.contains("ADMIN"))) {
            Integer otherAdmins = users.countOtherActiveAdmins(id);
            if (otherAdmins == null || otherAdmins == 0)
                throw ApiException.validation("Não é possível remover ou desativar o último administrador ativo.");
        }
        List<Long> roleIds = values.containsKey("roleCodes") ? resolveRoles(codes(values.get("roleCodes"))) : List.of();
        Map<String, Object> update = new LinkedHashMap<>();
        if (values.containsKey("username")) update.put("USERNAME", values.get("username"));
        if (values.containsKey("displayName")) update.put("DISPLAY_NAME", values.get("displayName"));
        if (values.containsKey("email")) update.put("EMAIL", values.get("email"));
        if (values.containsKey("active")) update.put("ACTIVE", Boolean.TRUE.equals(values.get("active")) ? 1 : 0);
        if (values.containsKey("password")) update.put("PASSWORD_HASH", passwords.encode((String) values.get("password")));
        if (!update.isEmpty()) {
            users.update(id, update, actor.id());
        }
        if (values.containsKey("roleCodes")) {
            users.replaceRoles(id, roleIds);
        }
        Map<String, Object> user = getUser(id);
        audit(actor.id(), "UPDATE", "USERS", id, before, user, ip, null);
        return user;
    }

    @Transactional
    public Map<String, Object> setUserActive(long id, boolean active, HubPrincipal actor, String ip) {
        return updateUser(id, Map.of("active", active), actor, ip);
    }

    private Map<String, Object> normalizeApp(Map<String, Object> input, boolean creating) {
        Map<String, Object> body = objectBody(input);
        rejectUnknown(body, APP_FIELDS.keySet());
        if (creating && (!(body.get("name") instanceof String n) || n.trim().isEmpty()
                || !(body.get("url") instanceof String u) || u.trim().isEmpty()))
            throw ApiException.validation("Nome e URL são obrigatórios.");
        Map<String, Object> out = new LinkedHashMap<>();
        for (String key : APP_FIELDS.keySet()) {
            if (!body.containsKey(key)) continue;
            Object value = body.get(key);
            boolean nullable = Set.of("subtitle", "description", "category", "icon", "minRoleId").contains(key);
            if (value == null && nullable) { out.put(key, null); continue; }
            if (Set.of("sortOrder", "minRoleId").contains(key)) {
                long number = integerValue(value, key);
                if (key.equals("minRoleId") && number < 1) throw ApiException.validation(key + " deve ser um ID positivo.");
                if (number < Integer.MIN_VALUE || number > Integer.MAX_VALUE) throw ApiException.validation(key + " está fora do intervalo permitido.");
                out.put(key, (int) number); continue;
            }
            String text = requiredString(value, key);
            if (text.isEmpty() && !nullable) throw ApiException.validation(key + " não pode ficar vazio.");
            int max = APP_MAX.get(key);
            if (text.length() > max) throw ApiException.validation(key + " não pode exceder " + max + " caracteres.");
            out.put(key, text.isEmpty() ? null : text);
        }
        if (creating) {
            out.putIfAbsent("status", "ATIVO");
            out.putIfAbsent("sortOrder", 0);
        } else if (out.isEmpty()) throw ApiException.validation("Informe pelo menos um campo para atualizar.");
        return out;
    }

    private Map<String, Object> normalizeCatalog(String resource, Map<String, Object> input, boolean creating) {
        Catalog catalog = catalog(resource);
        Map<String, Object> body = objectBody(input);
        rejectUnknown(body, catalog.fields.keySet());
        Map<String, Object> out = new LinkedHashMap<>();
        for (var entry : catalog.fields.entrySet()) {
            String key = entry.getKey(); Field field = entry.getValue();
            if (!body.containsKey(key)) {
                if (creating && field.required) throw ApiException.validation(key + " é obrigatório.");
                continue;
            }
            Object value = body.get(key);
            if (value == null && field.nullable) { out.put(key, null); continue; }
            if (field.type.equals("id")) {
                long id = integerValue(value, key);
                if (id < 1) throw ApiException.validation(key + " deve ser um ID positivo.");
                out.put(key, id);
            } else if (field.type.equals("time")) {
                if (!(value instanceof String text) || !TIME.matcher(text).matches())
                    throw ApiException.validation(key + " deve estar no formato HH:mm ou HH:mm:ss.");
                out.put(key, text);
            } else {
                String text = requiredString(value, key);
                if (field.required && text.isEmpty()) throw ApiException.validation(key + " é obrigatório.");
                if (text.isEmpty() && !field.nullable) throw ApiException.validation(key + " não pode ficar vazio.");
                if (text.length() > field.max) throw ApiException.validation(key + " não pode exceder " + field.max + " caracteres.");
                out.put(key, text.isEmpty() ? null : text);
            }
        }
        if (!creating && out.isEmpty()) throw ApiException.validation("Informe pelo menos um campo para atualizar.");
        return out;
    }

    private Map<String, Object> normalizeUser(Map<String, Object> input, boolean creating) {
        Map<String, Object> body = objectBody(input);
        Set<String> allowed = Set.of("username", "displayName", "email", "password", "roleCodes", "active");
        rejectUnknown(body, allowed);
        Map<String, Object> out = new LinkedHashMap<>();
        for (var field : List.of(Map.entry("username", 80), Map.entry("displayName", 160))) {
            String name = field.getKey();
            if (!body.containsKey(name)) { if (creating) throw ApiException.validation(name + " é obrigatório."); continue; }
            String value = requiredString(body.get(name), name);
            if (value.isEmpty() || value.length() > field.getValue())
                throw ApiException.validation(name + " deve conter de 1 a " + field.getValue() + " caracteres.");
            out.put(name, value);
        }
        if (body.containsKey("email")) {
            Object value = body.get("email");
            if (value == null || value.equals("")) out.put("email", null);
            else if (!(value instanceof String email) || email.trim().length() > 160 || email.chars().anyMatch(Character::isWhitespace))
                throw ApiException.validation("email deve conter no máximo 160 caracteres e não pode ter espaços.");
            else out.put("email", email.trim());
        }
        if (body.containsKey("password") || creating) {
            Object value = body.get("password");
            if (!(value instanceof String password) || password.length() < 14 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
                throw ApiException.validation("password deve ter pelo menos 14 e no máximo 72 bytes.");
            out.put("password", value);
        }
        if (body.containsKey("roleCodes") || creating) {
            Object raw = body.get("roleCodes");
            if (!(raw instanceof List<?> list) || list.isEmpty())
                throw ApiException.validation("Informe pelo menos uma função para o usuário.");
            List<String> codes = new ArrayList<>();
            for (Object value : list) {
                if (!(value instanceof String code) || code.trim().isEmpty() || code.trim().length() > 40)
                    throw ApiException.validation("Cada função deve ser um código válido.");
                codes.add(code.trim().toUpperCase());
            }
            if (new HashSet<>(codes).size() != codes.size()) throw ApiException.validation("Não repita funções no mesmo usuário.");
            out.put("roleCodes", codes);
        }
        if (body.containsKey("active")) {
            if (!(body.get("active") instanceof Boolean)) throw ApiException.validation("active deve ser true ou false.");
            out.put("active", body.get("active"));
        }
        if (!creating && out.isEmpty()) throw ApiException.validation("Informe pelo menos um campo para atualizar.");
        return out;
    }

    private Map<String, Object> catalogRecord(String resource, long id, boolean includeInactive) {
        Catalog catalog = catalog(resource);
        List<Map<String, Object>> rows = catalogs.find(catalog.table, id, includeInactive);
        if (rows.isEmpty()) throw ApiException.validation("Registro não encontrado.");
        return rows.get(0);
    }

    private static Map<String, Object> required(List<Map<String, Object>> rows, String message) {
        if (rows.isEmpty()) throw ApiException.validation(message);
        return rows.get(0);
    }

    private void audit(long userId, String action, String entity, Object entityId, Object oldValue, Object newValue, String ip, String userAgent) {
        audits.insert(userId, action, entity, entityId == null ? null : String.valueOf(entityId),
                json(oldValue), json(newValue), ip, userAgent);
    }

    private String json(Object value) {
        if (value == null) return null;
        try { return mapper.writeValueAsString(value); }
        catch (JsonProcessingException ex) { throw new IllegalStateException(ex); }
    }

    private List<Long> resolveRoles(List<String> codes) {
        List<Long> ids = users.resolveRoleIds(codes);
        if (ids.size() != codes.size()) throw ApiException.validation("Uma ou mais funções informadas não existem ou estão inativas.");
        return ids;
    }

    private void validateOperationReference(String resource, Map<String, Object> values) {
        if (resource.equals("operators") && values.containsKey("operationId") && values.get("operationId") != null
                && !catalogs.operationIsActive(values.get("operationId")))
            throw ApiException.validation("A operação informada não existe ou está inativa.");
    }

    private Catalog catalog(String resource) {
        Catalog result = CATALOGS.get(resource);
        if (result == null) throw new IllegalArgumentException("Unknown resource");
        return result;
    }

    private HubPrincipal principal(long id, String username, String displayName, List<String> roles, List<String> permissions) {
        return new HubPrincipal(id, username, displayName, roles, permissions);
    }

    private static Map<String, Object> objectBody(Map<String, Object> body) {
        if (body == null) throw ApiException.validation("O corpo da requisição deve ser um objeto.");
        return body;
    }

    private static void rejectUnknown(Map<String, Object> input, Set<String> allowed) {
        for (String key : input.keySet()) if (!allowed.contains(key)) throw ApiException.validation("Campo não permitido: " + key + ".");
    }

    private static String requiredString(Object value, String field) {
        if (!(value instanceof String text)) throw ApiException.validation(field + " deve ser texto.");
        return text.trim();
    }

    private static long integerValue(Object value, String field) {
        if (!(value instanceof Number number) || number.doubleValue() != Math.rint(number.doubleValue())
                || Math.abs(number.doubleValue()) > 9_007_199_254_740_991d)
            throw ApiException.validation(field + " deve ser um número inteiro.");
        return number.longValue();
    }

    private static long positiveId(String raw, String field) {
        if (raw == null || !raw.matches("^[1-9]\\d*$")) throw ApiException.validation(field + " deve ser um número inteiro positivo.");
        try { return Long.parseLong(raw); }
        catch (NumberFormatException ex) { throw ApiException.validation(field + " está fora do intervalo permitido."); }
    }

    private static String shortText(String value, String field, int max) {
        if (value == null || value.trim().isEmpty() || value.trim().length() > max)
            throw ApiException.validation(field + " deve conter de 1 a " + max + " caracteres.");
        return value.trim();
    }

    private static boolean hasText(String value) { return value != null && !value.trim().isEmpty(); }

    private static void validateSearch(String search) {
        if (search != null && search.length() > 100) throw ApiException.validation("search deve ser texto com até 100 caracteres.");
    }

    private static List<String> codes(Object value) { return (List<String>) value; }
    private static long number(Object value) { return ((Number) value).longValue(); }
    private static boolean truth(Object value) { return Boolean.TRUE.equals(value) || value instanceof Number number && number.intValue() == 1 || "1".equals(value); }

    private static Instant date(String value, String field) {
        if (value == null) return null;
        if (!value.matches("^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{1,3})?Z?)?$"))
            throw ApiException.validation(field + " deve ser uma data ISO válida.");
        try {
            if (value.length() == 10) return java.time.LocalDate.parse(value).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
            return Instant.parse(value.endsWith("Z") ? value : value + "Z");
        } catch (DateTimeParseException ex) { throw ApiException.validation(field + " deve ser uma data ISO válida."); }
    }

    private static LocalTime parseTime(Object value) {
        if (value instanceof LocalTime time) return time;
        if (value instanceof java.sql.Time time) return time.toLocalTime();
        String text = String.valueOf(value);
        try { return LocalTime.parse(text.length() == 5 ? text + ":00" : text, DateTimeFormatter.ISO_LOCAL_TIME); }
        catch (DateTimeParseException ex) { return LocalTime.MIDNIGHT; }
    }

    @SuppressWarnings("unchecked")
    private static <V> Map<String, V> orderedFields(Object... pairs) {
        Map<String, V> values = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) values.put((String) pairs[i], (V) pairs[i + 1]);
        return java.util.Collections.unmodifiableMap(values);
    }

    private record Field(String column, String type, boolean required, boolean nullable, int max) {}
    private record Catalog(String table, boolean audited, Map<String, Field> fields) {}
}
