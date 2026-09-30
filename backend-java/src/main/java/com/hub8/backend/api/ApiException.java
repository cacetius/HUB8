package com.hub8.backend.api;

public class ApiException extends RuntimeException {
    private final String code;
    private final int status;

    public ApiException(String message, String code, int status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() { return code; }
    public int getStatus() { return status; }

    public static ApiException validation(String message) { return new ApiException(message, "VALIDATION_ERROR", 422); }
    public static ApiException unauthenticated(String message) { return new ApiException(message, "UNAUTHENTICATED", 401); }
    public static ApiException expired(String message) { return new ApiException(message, "SESSION_EXPIRED", 401); }
    public static ApiException forbidden() { return new ApiException("Permissão insuficiente para esta ação.", "FORBIDDEN", 403); }
}
