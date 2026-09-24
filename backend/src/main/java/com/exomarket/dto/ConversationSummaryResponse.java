package com.exomarket.dto;

import java.time.OffsetDateTime;

public record ConversationSummaryResponse(
        Long orderId,
        String orderTitle,
        String patientReference,
        String otherPartyName,
        String otherPartyAvatarUrl,
        String lastMessageText,
        OffsetDateTime lastMessageCreatedAt,
        long unreadCount
) {
}
