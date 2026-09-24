package com.exomarket.service;

import com.exomarket.domain.User;
import com.exomarket.config.StorageProperties;
import com.exomarket.dto.UpdateProfileRequest;
import com.exomarket.dto.UserProfileResponse;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserRepository userRepository;
    private final StorageProperties storageProperties;

    public UserProfileService(UserRepository userRepository, StorageProperties storageProperties) {
        this.userRepository = userRepository;
        this.storageProperties = storageProperties;
    }

    @Transactional
    public UserProfileResponse update(UpdateProfileRequest request, AuthenticatedUser currentUser) {
        User user = userRepository.findById(currentUser.id())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + currentUser.id()));
        user.setName(request.name().trim());
        user.setAvatarUrl(validateAvatarUrl(request.avatarUrl(), currentUser.id()));
        return toResponse(userRepository.save(user));
    }

    private String validateAvatarUrl(String avatarUrl, Long userId) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return null;
        }
        String normalized = avatarUrl.trim();
        String expectedPrefix = "%s/%s/avatars/%d/".formatted(
                storageProperties.publicEndpoint().replaceAll("/$", ""),
                storageProperties.avatarBucket(),
                userId
        );
        if (!normalized.startsWith(expectedPrefix)) {
            throw new IllegalArgumentException("Profile photos must be uploaded through the file selector");
        }
        return normalized;
    }

    private UserProfileResponse toResponse(User user) {
        return new UserProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getAvatarUrl());
    }
}
