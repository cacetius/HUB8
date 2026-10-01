package com.hub8.backend.persistence;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hub8.backend.api.ApiException;
import com.hub8.backend.config.HubSettings;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SharePointFileStoreTest {
    @Test
    void reportsUnavailableWhenSharePointIsNotConfigured() {
        HubSettings settings = mock(HubSettings.class);
        when(settings.isSharePointConfigured()).thenReturn(false);
        SharePointFileStore files = new SharePointFileStore(settings, new ObjectMapper());

        ApiException error = assertThrows(ApiException.class, () -> files.listHtml());

        assertEquals(503, error.getStatus());
        assertEquals("STORAGE_NOT_CONFIGURED", error.getCode());
    }

    @Test
    void rejectsInvalidFileIdsBeforeCallingGraph() {
        HubSettings settings = mock(HubSettings.class);
        when(settings.isSharePointConfigured()).thenReturn(true);
        SharePointFileStore files = new SharePointFileStore(settings, new ObjectMapper());

        ApiException error = assertThrows(ApiException.class, () -> files.downloadHtml("../file"));

        assertEquals(422, error.getStatus());
        assertEquals("VALIDATION_ERROR", error.getCode());
    }
}
