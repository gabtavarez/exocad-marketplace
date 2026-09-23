package com.exomarket.dto;

import com.exomarket.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record OrderResponse(
        Long id,
        Long userId,
        OrderStatus status,
        String title,
        String description,
        BigDecimal totalAmount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<OrderItemResponse> items
) {

    public record OrderItemResponse(
            Long id,
            Integer toothNumber,
            String serviceType,
            String notes
    ) {
    }
}
