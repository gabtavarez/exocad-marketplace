package com.exomarket.dto;

import java.time.OffsetDateTime;

public record AttachmentDownloadUrlResponse(
        Long attachmentId,
        String downloadUrl,
        OffsetDateTime expiresAt
) {
}
