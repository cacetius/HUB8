package com.hub8.backend.api;

import java.io.IOException;

public class RequestBodyTooLargeException extends IOException {
    public RequestBodyTooLargeException() { super("Request body exceeds configured size limit."); }
}
