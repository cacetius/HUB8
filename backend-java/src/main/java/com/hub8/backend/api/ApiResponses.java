package com.hub8.backend.api;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

public final class ApiResponses {
    private ApiResponses() {}
    public static Map<String, Object> success(Object data) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("message", null);
        return response;
    }
    public static ResponseEntity<Map<String, Object>> ok(Object data) {
        return ResponseEntity.ok(success(data));
    }
    public static ResponseEntity<Map<String, Object>> created(Object data) {
        return ResponseEntity.status(HttpStatus.CREATED).body(success(data));
    }
    public static Map<String, Object> errorBody(String message, String code) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", false);
        response.put("data", null);
        response.put("message", message);
        response.put("code", code);
        return response;
    }
}
