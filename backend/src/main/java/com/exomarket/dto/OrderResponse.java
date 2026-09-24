package com.exomarket.dto;

import com.exomarket.AttachmentStage;
import com.exomarket.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long userId,
        Long designerId,
        OrderStatus status,
        String title,
        String description,
        BigDecimal totalAmount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<OrderItemResponse> items,
        List<OrderAttachmentResponse> attachments,
        String revisionFeedback
) {

    public record OrderItemResponse(
            Long id,
            Integer toothNumber,
            String serviceType,
            String notes
    ) {
    }

    public record OrderAttachmentResponse(
            Long id,
            String fileName,
            Long size,
            AttachmentStage stage,
            String mimeType,
            Boolean uploaded,
            OffsetDateTime createdAt
    ) {
    }
}
