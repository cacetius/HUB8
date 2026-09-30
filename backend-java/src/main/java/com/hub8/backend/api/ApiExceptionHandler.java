package com.hub8.backend.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> apiError(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(ApiResponses.errorBody(ex.getMessage(), ex.getCode()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> invalidBody(HttpMessageNotReadableException ex) {
        Throwable cause = ex;
        while (cause != null) {
            if (cause instanceof RequestBodyTooLargeException)
                return ResponseEntity.status(413).body(ApiResponses.errorBody("Corpo da requisição excede 2 MB.", "PAYLOAD_TOO_LARGE"));
            cause = cause.getCause();
        }
        return ResponseEntity.status(500).body(ApiResponses.errorBody("Erro interno do servidor.", "INTERNAL_ERROR"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> internal(Exception ex, HttpServletRequest request) {
        LOG.error("Falha em {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ResponseEntity.status(500).body(ApiResponses.errorBody("Erro interno do servidor.", "INTERNAL_ERROR"));
    }
}
