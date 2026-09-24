package com.exomarket.security;

import com.exomarket.UserRole;

public record AuthenticatedUser(Long id, String email, UserRole role) {
}
