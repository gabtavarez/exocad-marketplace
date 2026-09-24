package com.exomarket.dto;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        String title,
        String message,
        String linkUrl,
        boolean read,
        OffsetDateTime createdAt
) {
}
