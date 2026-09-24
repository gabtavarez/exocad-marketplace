package com.exomarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateOrderMessageRequest(
        @NotBlank @Size(max = 2000) String content
) {
}
