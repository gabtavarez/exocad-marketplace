package com.exomarket.dto;

import com.exomarket.ApplicationStatus;
import java.time.OffsetDateTime;

public record OrderApplicationResponse(
        Long id,
        Long orderId,
        Long designerId,
        String designerName,
        String designerAvatarUrl,
        ApplicationStatus status,
        OffsetDateTime createdAt
) {
}
