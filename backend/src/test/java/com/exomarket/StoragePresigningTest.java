package com.exomarket;

import static org.assertj.core.api.Assertions.assertThat;

import com.exomarket.config.StorageProperties;
import com.exomarket.dto.CreateAvatarUploadUrlRequest;
import com.exomarket.security.AuthenticatedUser;
import com.exomarket.service.FileStorageService;
import org.junit.jupiter.api.Test;

class StoragePresigningTest {

    private static final CreateAvatarUploadUrlRequest REQUEST =
            new CreateAvatarUploadUrlRequest("profile.png", "image/png", 1024L);
    private static final AuthenticatedUser USER =
            new AuthenticatedUser(42L, "user@example.com", UserRole.DENTIST);

    @Test
    void minioUsesPathStyleUrls() {
        FileStorageService service = service(new StorageProperties(
                "http://localhost:9000",
                "http://localhost:9000",
                "us-east-1",
                "exocad-cases",
                "profile-avatars",
                "minioadmin",
                "minioadmin",
                true,
                15
        ));

        var response = service.createAvatarUploadUrl(REQUEST, USER);

        assertThat(response.uploadUrl()).startsWith("http://localhost:9000/profile-avatars/avatars/42/");
        assertThat(response.publicUrl()).startsWith("http://localhost:9000/profile-avatars/avatars/42/");
    }

    @Test
    void r2UsesVirtualHostStyleUrls() {
        FileStorageService service = service(new StorageProperties(
                "https://account-id.r2.cloudflarestorage.com",
                "https://account-id.r2.cloudflarestorage.com",
                "auto",
                "exocad-cases",
                "profile-avatars",
                "access-key",
                "secret-key",
                false,
                15
        ));

        var response = service.createAvatarUploadUrl(REQUEST, USER);

        assertThat(response.uploadUrl())
                .startsWith("https://profile-avatars.account-id.r2.cloudflarestorage.com/avatars/42/")
                .contains("X-Amz-Signature=");
        assertThat(response.publicUrl())
                .startsWith("https://profile-avatars.account-id.r2.cloudflarestorage.com/avatars/42/");
    }

    private FileStorageService service(StorageProperties properties) {
        return new FileStorageService(properties, null, null);
    }
}
