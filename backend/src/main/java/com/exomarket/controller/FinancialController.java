package com.exomarket.controller;

import com.exomarket.dto.FinancialSummaryResponse;
import com.exomarket.dto.WalletTransactionResponse;
import com.exomarket.security.AuthenticatedUser;
import com.exomarket.service.FinancialService;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/financial")
public class FinancialController {

    private final FinancialService financialService;

    public FinancialController(FinancialService financialService) {
        this.financialService = financialService;
    }

    @GetMapping("/summary")
    public FinancialSummaryResponse summary(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return financialService.summary(currentUser);
    }

    @GetMapping("/statement")
    public Page<WalletTransactionResponse> statement(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        return financialService.statement(currentUser, page, size);
    }
}
