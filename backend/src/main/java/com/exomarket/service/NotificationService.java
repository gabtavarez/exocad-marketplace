package com.exomarket.service;

import com.exomarket.domain.Notification;
import com.exomarket.domain.User;
import com.exomarket.dto.NotificationResponse;
import com.exomarket.repository.NotificationRepository;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(NotificationRepository notificationRepository, UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void notify(Long userId, String title, String message, String linkUrl) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setLinkUrl(linkUrl);
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(AuthenticatedUser currentUser) {
        return notificationRepository.findTop15ByUserIdOrderByCreatedAtDesc(currentUser.id()).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount(AuthenticatedUser currentUser) {
        return notificationRepository.countByUserIdAndReadFalse(currentUser.id());
    }

    @Transactional
    public void markRead(Long id, AuthenticatedUser currentUser) {
        Notification notification = notificationRepository.findByIdAndUserId(id, currentUser.id())
                .orElseThrow(() -> new EntityNotFoundException("Notification not found: " + id));
        notification.setRead(true);
    }

    @Transactional
    public void markAllRead(AuthenticatedUser currentUser) {
        notificationRepository.markAllRead(currentUser.id());
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getLinkUrl(),
                notification.isRead(),
                notification.getCreatedAt()
        );
    }
}
