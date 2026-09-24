package com.exomarket.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2048) String avatarUrl
) {
}
