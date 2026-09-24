package com.exomarket.service;

import com.exomarket.UserRole;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderMessage;
import com.exomarket.domain.User;
import com.exomarket.dto.OrderMessageResponse;
import com.exomarket.dto.ConversationSummaryResponse;
import com.exomarket.repository.NotificationRepository;
import com.exomarket.repository.OrderMessageRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import java.util.Comparator;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderMessageService {

    private final OrderRepository orderRepository;
    private final OrderMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;

    public OrderMessageService(
            OrderRepository orderRepository,
            OrderMessageRepository messageRepository,
            UserRepository userRepository,
            NotificationService notificationService,
            NotificationRepository notificationRepository
    ) {
        this.orderRepository = orderRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> conversations(AuthenticatedUser currentUser) {
        return orderRepository.findConversationOrders(currentUser.id()).stream()
                .map(order -> toConversation(order, currentUser))
                .sorted(Comparator.comparing(
                        ConversationSummaryResponse::lastMessageCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderMessageResponse> list(Long orderId, AuthenticatedUser currentUser) {
        Order order = getOrderOrThrow(orderId);
        requireCanAccessMessages(order, currentUser);

        return messageRepository.findByOrderIdOrderByCreatedAtAsc(orderId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OrderMessageResponse create(Long orderId, String content, AuthenticatedUser currentUser) {
        Order order = getOrderOrThrow(orderId);
        requireCanAccessMessages(order, currentUser);

        User sender = userRepository.findById(currentUser.id())
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + currentUser.id()));

        OrderMessage message = new OrderMessage();
        message.setOrder(order);
        message.setSender(sender);
        message.setContent(content.trim());

        OrderMessage saved = messageRepository.save(message);
        Long recipientId = currentUser.role() == UserRole.DESIGNER ? order.getUserId() : order.getDesignerId();
        notificationService.notify(
                recipientId,
                "Nova mensagem no Caso #" + orderId,
                sender.getName() + ": " + summarize(message.getContent()),
                "/orders/" + orderId
        );
        return toResponse(saved);
    }

    private Order getOrderOrThrow(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
    }

    private void requireCanAccessMessages(Order order, AuthenticatedUser currentUser) {
        boolean allowed = order.getDesignerId() != null && (currentUser.role() == UserRole.DENTIST
                ? currentUser.id().equals(order.getUserId())
                : currentUser.id().equals(order.getDesignerId()));

        if (!allowed) {
            throw new AccessDeniedException("User cannot access messages for this order");
        }
    }

    private OrderMessageResponse toResponse(OrderMessage message) {
        User sender = message.getSender();
        return new OrderMessageResponse(
                message.getId(),
                message.getOrder().getId(),
                sender.getId(),
                sender.getName(),
                sender.getRole(),
                message.getContent(),
                message.getCreatedAt()
        );
    }

    private String summarize(String content) {
        return content.length() <= 120 ? content : content.substring(0, 117) + "...";
    }

    private ConversationSummaryResponse toConversation(Order order, AuthenticatedUser currentUser) {
        Long otherPartyId = currentUser.role() == UserRole.DENTIST ? order.getDesignerId() : order.getUserId();
        User otherParty = userRepository.findById(otherPartyId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + otherPartyId));
        OrderMessage lastMessage = messageRepository.findTopByOrderIdOrderByCreatedAtDesc(order.getId())
                .orElse(null);
        long unreadCount = notificationRepository.countByUserIdAndReadFalseAndLinkUrlAndTitleStartingWith(
                currentUser.id(),
                "/orders/" + order.getId(),
                "Nova mensagem"
        );
        return new ConversationSummaryResponse(
                order.getId(),
                order.getTitle(),
                "Caso #" + String.format("%05d", order.getId()),
                otherParty.getName(),
                otherParty.getAvatarUrl(),
                lastMessage == null ? "Conversa disponível" : summarize(lastMessage.getContent()),
                lastMessage == null ? null : lastMessage.getCreatedAt(),
                unreadCount
        );
    }
}
