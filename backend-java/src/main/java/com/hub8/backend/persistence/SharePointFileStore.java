package com.hub8.backend.persistence;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.config.HubSettings;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class SharePointFileStore {
    private static final String GRAPH = "https://graph.microsoft.com/v1.0";
    private static final int MAX_FILE_BYTES = 10 * 1024 * 1024;
    private final HubSettings settings;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public SharePointFileStore(HubSettings settings, ObjectMapper mapper) {
        this.settings = settings;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
    }

    public Map<String, Object> uploadHtml(String fileName, byte[] content) {
        return upload(settings.getSharePointHtmlFolder(), fileName, "text/html; charset=utf-8", content);
    }

    public Map<String, Object> uploadBackup(String fileName, byte[] content) {
        return upload(settings.getSharePointBackupFolder(), fileName, "application/json; charset=utf-8", content);
    }

    public List<Map<String, Object>> listHtml() {
        return list(settings.getSharePointHtmlFolder());
    }

    public List<Map<String, Object>> listBackups() {
        return list(settings.getSharePointBackupFolder());
    }

    public StoredFile downloadHtml(String id) {
        return download(id);
    }

    public StoredFile downloadBackup(String id) {
        return download(id);
    }

    private Map<String, Object> upload(String folder, String fileName, String contentType, byte[] content) {
        requireConfigured();
        String uniqueName = UUID.randomUUID() + "-" + fileName;
        String path = "/drives/" + encode(settings.getSharePointDriveId()) + "/root:/"
                + encodePath(folder + "/" + uniqueName) + ":/content";
        Map<String, Object> item = graph("PUT", path, contentType, content, Map.class);
        if (!(item.get("id") instanceof String id) || !(item.get("name") instanceof String name)
                || !(item.get("size") instanceof Number size))
            throw new ApiException("Microsoft Graph retornou metadados de arquivo inválidos.", "STORAGE_ERROR", 502);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("name", name);
        result.put("size", size);
        result.put("webUrl", item.get("webUrl"));
        result.put("eTag", item.get("eTag"));
        return result;
    }

    private List<Map<String, Object>> list(String folder) {
        requireConfigured();
        String path = "/drives/" + encode(settings.getSharePointDriveId()) + "/root:/"
                + encodePath(folder) + ":/children?$top=100&$orderby=lastModifiedDateTime%20desc"
                + "&$select=id,name,size,webUrl,lastModifiedDateTime,eTag";
        Map<String, Object> response = graph("GET", path, "application/json", null, Map.class);
        Object rawItems = response.get("value");
        if (!(rawItems instanceof List<?> items))
            throw new ApiException("Microsoft Graph retornou uma lista de arquivos inválida.", "STORAGE_ERROR", 502);
        return items.stream()
                .filter(Map.class::isInstance)
                .map(item -> (Map<String, Object>) item)
                .map(SharePointFileStore::fileSummary)
                .toList();
    }

    private StoredFile download(String id) {
        requireConfigured();
        if (id == null || !id.matches("[A-Za-z0-9_!.-]{1,256}"))
            throw ApiException.validation("Identificador de arquivo inválido.");
        String path = "/drives/" + encode(settings.getSharePointDriveId()) + "/items/" + encode(id) + "/content";
        HttpResponse<byte[]> response = send(graphRequest("GET", GRAPH + path, bearer()));
        if (response.statusCode() != 302 && response.statusCode() != 303)
            throw graphFailure(response.statusCode());
        String location = response.headers().firstValue("Location").orElseThrow(
                () -> new ApiException("SharePoint não retornou o link de download.", "STORAGE_ERROR", 502));
        URI downloadUri;
        try {
            downloadUri = URI.create(location);
        } catch (IllegalArgumentException ex) {
            throw new ApiException("SharePoint retornou um link de download inválido.", "STORAGE_ERROR", 502);
        }
        String downloadHost = downloadUri.getHost() == null ? "" : downloadUri.getHost().toLowerCase(java.util.Locale.ROOT);
        if (!"https".equalsIgnoreCase(downloadUri.getScheme())
                || !(downloadHost.endsWith(".sharepoint.com") || downloadHost.endsWith(".sharepointonline.com")
                || downloadHost.endsWith(".1drv.com"))
                || downloadUri.getUserInfo() != null
                || downloadUri.getPort() != -1 && downloadUri.getPort() != 443)
            throw new ApiException("SharePoint retornou um destino de download inseguro.", "STORAGE_ERROR", 502);
        HttpResponse<InputStream> file;
        try {
            file = http.send(HttpRequest.newBuilder(downloadUri)
                    .timeout(Duration.ofSeconds(30)).GET().build(), HttpResponse.BodyHandlers.ofInputStream());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException("A operação SharePoint foi interrompida.", "STORAGE_ERROR", 502);
        } catch (IOException ex) {
            throw new ApiException("Não foi possível baixar o arquivo do SharePoint.", "STORAGE_UNAVAILABLE", 503);
        }
        if (file.statusCode() != 200) {
            closeResponse(file.body());
            throw graphFailure(file.statusCode());
        }
        long contentLength = file.headers().firstValueAsLong("Content-Length").orElse(-1);
        if (contentLength > MAX_FILE_BYTES) {
            closeResponse(file.body());
            throw new ApiException("O arquivo armazenado excede 10 MB.", "STORAGE_FILE_TOO_LARGE", 413);
        }
        try (InputStream body = file.body()) {
            byte[] content = body.readNBytes(MAX_FILE_BYTES + 1);
            if (content.length > MAX_FILE_BYTES)
                throw new ApiException("O arquivo armazenado excede 10 MB.", "STORAGE_FILE_TOO_LARGE", 413);
            return new StoredFile(content,
                    file.headers().firstValue("Content-Type").orElse("application/octet-stream"));
        } catch (IOException ex) {
            throw new ApiException("Não foi possível ler o arquivo do SharePoint.", "STORAGE_UNAVAILABLE", 503);
        }
    }

    private static void closeResponse(InputStream response) {
        try {
            response.close();
        } catch (IOException ex) {
            throw new ApiException("Não foi possível fechar a resposta do SharePoint.",
                    "STORAGE_UNAVAILABLE", 503);
        }
    }

    private String bearer() {
        requireConfigured();
        String form = "client_id=" + encode(settings.getSharePointClientId())
                + "&client_secret=" + encode(settings.getSharePointClientSecret())
                + "&scope=" + encode("https://graph.microsoft.com/.default")
                + "&grant_type=client_credentials";
        Map<String, Object> token = graph(
                HttpRequest.newBuilder(URI.create("https://login.microsoftonline.com/"
                                + encode(settings.getSharePointTenantId()) + "/oauth2/v2.0/token"))
                        .timeout(Duration.ofSeconds(15))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .build(),
                Map.class);
        Object value = token.get("access_token");
        if (!(value instanceof String accessToken) || accessToken.isBlank())
            throw new ApiException("Entra ID não retornou um token do Microsoft Graph.",
                    "STORAGE_AUTH_ERROR", 502);
        return "Bearer " + accessToken;
    }

    private <T> T graph(String method, String path, String contentType, byte[] body, Class<T> resultType) {
        HttpRequest.Builder request = HttpRequest.newBuilder(URI.create(GRAPH + path))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", bearer())
                .header("Content-Type", contentType);
        if ("PUT".equals(method)) request.PUT(HttpRequest.BodyPublishers.ofByteArray(body));
        else request.GET();
        return graph(request.build(), resultType);
    }

    private <T> T graph(HttpRequest request, Class<T> resultType) {
        HttpResponse<byte[]> response = send(request);
        if (response.statusCode() < 200 || response.statusCode() >= 300)
            throw graphFailure(response.statusCode());
        try {
            return mapper.readValue(response.body(), resultType);
        } catch (IOException ex) {
            throw new ApiException("Resposta inválida do Microsoft Graph.", "STORAGE_ERROR", 502);
        }
    }

    private HttpRequest graphRequest(String method, String uri, String authorization) {
        return HttpRequest.newBuilder(URI.create(uri))
                .timeout(Duration.ofSeconds(30))
                .header("Authorization", authorization)
                .method(method, HttpRequest.BodyPublishers.noBody())
                .build();
    }

    private HttpResponse<byte[]> send(HttpRequest request) {
        try {
            return http.send(request, HttpResponse.BodyHandlers.ofByteArray());
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new ApiException("A operação SharePoint foi interrompida.", "STORAGE_ERROR", 502);
        } catch (IOException ex) {
            throw new ApiException("Não foi possível conectar ao Microsoft Graph.", "STORAGE_UNAVAILABLE", 503);
        }
    }

    private void requireConfigured() {
        if (!settings.isSharePointConfigured())
            throw new ApiException("O armazenamento SharePoint ainda não foi configurado.",
                    "STORAGE_NOT_CONFIGURED", 503);
    }

    private static ApiException graphFailure(int status) {
        return new ApiException("O Microsoft Graph recusou a operação de arquivo (HTTP " + status + ").",
                "STORAGE_ERROR", status == 404 ? 404 : 502);
    }

    private static String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/"))
                .map(SharePointFileStore::encode)
                .collect(java.util.stream.Collectors.joining("/"));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static Map<String, Object> fileSummary(Map<String, Object> item) {
        Map<String, Object> summary = new LinkedHashMap<>();
        for (String field : List.of("id", "name", "size", "webUrl", "lastModifiedDateTime", "eTag"))
            if (item.containsKey(field)) summary.put(field, item.get(field));
        return summary;
    }

    public record StoredFile(byte[] content, String contentType) {}
}
