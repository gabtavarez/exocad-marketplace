package com.exomarket.controller;

import com.exomarket.dto.AvatarUploadUrlResponse;
import com.exomarket.dto.CreateAvatarUploadUrlRequest;
import com.exomarket.dto.UpdateProfileRequest;
import com.exomarket.dto.UserProfileResponse;
import com.exomarket.security.AuthenticatedUser;
import com.exomarket.service.UserProfileService;
import com.exomarket.service.FileStorageService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileService userProfileService;
    private final FileStorageService fileStorageService;

    public UserProfileController(UserProfileService userProfileService, FileStorageService fileStorageService) {
        this.userProfileService = userProfileService;
        this.fileStorageService = fileStorageService;
    }

    @PutMapping("/me")
    public UserProfileResponse update(
            @Valid @RequestBody UpdateProfileRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return userProfileService.update(request, currentUser);
    }

    @PostMapping("/me/avatar-upload-url")
    public AvatarUploadUrlResponse createAvatarUploadUrl(
            @Valid @RequestBody CreateAvatarUploadUrlRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return fileStorageService.createAvatarUploadUrl(request, currentUser);
    }
}
