package com.exomarket.dto;

import com.exomarket.UserRole;

public record AuthResponse(
        String token,
        UserResponse user
) {
    public record UserResponse(Long id, String name, String email, UserRole role, String avatarUrl) {
    }
}
