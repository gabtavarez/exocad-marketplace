package com.exomarket.dto;

import java.time.OffsetDateTime;

public record UploadUrlResponse(
        Long attachmentId,
        String uploadUrl,
        String storagePath,
        OffsetDateTime expiresAt
) {
}
