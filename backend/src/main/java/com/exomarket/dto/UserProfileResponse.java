package com.exomarket.dto;

import com.exomarket.UserRole;

public record UserProfileResponse(Long id, String name, String email, UserRole role, String avatarUrl) {
}
