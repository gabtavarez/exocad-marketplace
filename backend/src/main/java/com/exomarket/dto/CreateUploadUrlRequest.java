package com.exomarket.dto;

import com.exomarket.AttachmentStage;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record CreateUploadUrlRequest(
        @NotBlank String fileName,
        @NotBlank String mimeType,
        @NotNull @Positive Long size,
        @NotNull AttachmentStage attachmentStage
) {
}
