package com.exomarket.dto;

import java.math.BigDecimal;

public record FinancialSummaryResponse(
        BigDecimal availableBalance,
        BigDecimal escrowBalance,
        BigDecimal totalEarnedOrSpent,
        long invoicedCases
) {
}
