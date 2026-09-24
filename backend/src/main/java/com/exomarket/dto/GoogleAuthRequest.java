package com.exomarket.dto;

import com.exomarket.UserRole;
import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank String credential,
        UserRole role
) {
}
