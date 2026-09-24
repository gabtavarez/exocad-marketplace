package com.exomarket.service;

import com.exomarket.UserRole;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderMessage;
import com.exomarket.domain.User;
import com.exomarket.dto.OrderMessageResponse;
import com.exomarket.repository.OrderMessageRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderMessageService {

    private final OrderRepository orderRepository;
    private final OrderMessageRepository messageRepository;
    private final UserRepository userRepository;

    public OrderMessageService(
            OrderRepository orderRepository,
            OrderMessageRepository messageRepository,
            UserRepository userRepository
    ) {
        this.orderRepository = orderRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
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

        return toResponse(messageRepository.save(message));
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
}
