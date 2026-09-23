package com.exomarket.dto;

import jakarta.validation.constraints.NotBlank;

public record RequestRevisionRequest(
        @NotBlank String feedback
) {
}
