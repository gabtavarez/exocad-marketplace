package com.exomarket.dto;

import com.exomarket.UserRole;
import java.time.OffsetDateTime;

public record OrderMessageResponse(
        Long id,
        Long orderId,
        Long senderId,
        String senderName,
        UserRole senderRole,
        String content,
        OffsetDateTime createdAt
) {
}
