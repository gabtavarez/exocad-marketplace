package com.exomarket.service;

import com.exomarket.UserRole;
import com.exomarket.domain.User;
import com.exomarket.dto.AuthResponse;
import com.exomarket.dto.GoogleAuthRequest;
import com.exomarket.dto.LoginRequest;
import com.exomarket.dto.RegisterRequest;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.JwtService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleIdTokenVerifier googleVerifier;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            @Value("${security.google.client-id:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;

        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        );
        this.googleVerifier = builder
                .setAudience(Collections.singletonList(googleClientId))
                .build();
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        return response(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalizeEmail(request.email()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        if (user.getPassword() == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return response(user);
    }

    @Transactional
    public AuthResponse google(GoogleAuthRequest request) {
        GoogleIdToken idToken = verifyGoogleToken(request.credential());
        GoogleIdToken.Payload payload = idToken.getPayload();

        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadCredentialsException("Google email is not verified");
        }

        String email = normalizeEmail(payload.getEmail());
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName((String) payload.get("name"));
            newUser.setRole(request.role() == null ? UserRole.DENTIST : request.role());
            return newUser;
        });

        user.setGoogleId(payload.getSubject());
        if (request.role() != null) {
            user.setRole(request.role());
        }
        if (user.getName() == null || user.getName().isBlank()) {
            user.setName(email);
        }
        return response(userRepository.save(user));
    }

    private GoogleIdToken verifyGoogleToken(String credential) {
        try {
            GoogleIdToken token = googleVerifier.verify(credential);
            if (token == null) {
                throw new BadCredentialsException("Invalid Google credential");
            }
            return token;
        } catch (GeneralSecurityException | IOException exception) {
            throw new BadCredentialsException("Unable to validate Google credential", exception);
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private AuthResponse response(User user) {
        return new AuthResponse(
                jwtService.generate(user),
                new AuthResponse.UserResponse(
                        user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getAvatarUrl()
                )
        );
    }
}
