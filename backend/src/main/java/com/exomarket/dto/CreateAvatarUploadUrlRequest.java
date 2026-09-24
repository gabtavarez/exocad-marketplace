package com.exomarket.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record CreateAvatarUploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String mimeType,
        @Positive @Max(5_242_880) Long size
) {
}
