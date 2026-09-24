package com.exomarket.controller;

import com.exomarket.dto.ConversationSummaryResponse;
import com.exomarket.security.AuthenticatedUser;
import com.exomarket.service.OrderMessageService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderMessageController {

    private final OrderMessageService orderMessageService;

    public OrderMessageController(OrderMessageService orderMessageService) {
        this.orderMessageService = orderMessageService;
    }

    @GetMapping("/conversations")
    public List<ConversationSummaryResponse> conversations(
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return orderMessageService.conversations(currentUser);
    }
}
