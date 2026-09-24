package com.exomarket.dto;

import java.time.OffsetDateTime;

public record AvatarUploadUrlResponse(String uploadUrl, String publicUrl, OffsetDateTime expiresAt) {
}
