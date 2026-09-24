package com.exomarket.dto;

import com.exomarket.WalletTransactionStatus;
import com.exomarket.WalletTransactionType;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record WalletTransactionResponse(
        Long id,
        Long orderId,
        WalletTransactionType type,
        BigDecimal amount,
        WalletTransactionStatus status,
        OffsetDateTime createdAt
) {
}
