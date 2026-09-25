package com.exomarket.service;

import com.exomarket.ApplicationStatus;
import com.exomarket.OrderStatus;
import com.exomarket.UserRole;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderApplication;
import com.exomarket.domain.User;
import com.exomarket.dto.OrderApplicationResponse;
import com.exomarket.dto.OrderResponse;
import com.exomarket.repository.OrderApplicationRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.UserRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderApplicationService {

    private final OrderApplicationRepository applicationRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final OrderService orderService;
    private final FinancialService financialService;
    private final NotificationService notificationService;

    public OrderApplicationService(
            OrderApplicationRepository applicationRepository,
            OrderRepository orderRepository,
            UserRepository userRepository,
            OrderService orderService,
            FinancialService financialService,
            NotificationService notificationService
    ) {
        this.applicationRepository = applicationRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.orderService = orderService;
        this.financialService = financialService;
        this.notificationService = notificationService;
    }

    @Transactional
    public OrderApplicationResponse apply(Long orderId, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DESIGNER);
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
        if (order.getStatus() != OrderStatus.OPEN || order.getDesignerId() != null) {
            throw new IllegalStateException("Only open, unassigned orders accept applications");
        }

        return applicationRepository.findByOrderIdAndDesignerId(orderId, currentUser.id())
                .map(this::toResponse)
                .orElseGet(() -> {
                    User designer = userRepository.findById(currentUser.id())
                            .orElseThrow(() -> new EntityNotFoundException("User not found: " + currentUser.id()));
                    OrderApplication application = new OrderApplication();
                    application.setOrder(order);
                    application.setDesigner(designer);
                    OrderApplication saved = applicationRepository.save(application);
                    notificationService.notify(
                            order.getUserId(),
                            "Nova candidatura recebida para o Caso #" + orderId,
                            designer.getName() + " demonstrou interesse no seu caso.",
                            "/orders/" + orderId
                    );
                    return toResponse(saved);
                });
    }

    @Transactional(readOnly = true)
    public List<OrderApplicationResponse> list(Long orderId, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DENTIST);
        Order order = getOrder(orderId);
        requireOwner(order, currentUser);
        return applicationRepository.findByOrderIdOrderByCreatedAtAsc(orderId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrderResponse accept(Long orderId, Long applicationId, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DENTIST);
        Order order = orderRepository.findByIdForUpdate(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
        requireOwner(order, currentUser);
        if (order.getStatus() != OrderStatus.OPEN || order.getDesignerId() != null) {
            throw new IllegalStateException("This order already has a designer or is no longer open");
        }

        List<OrderApplication> applications = applicationRepository.findByOrderIdOrderByCreatedAtAsc(orderId);
        OrderApplication accepted = applications.stream()
                .filter(application -> application.getId().equals(applicationId))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Application not found: " + applicationId));
        if (accepted.getStatus() != ApplicationStatus.PENDING) {
            throw new IllegalStateException("Only pending applications can be accepted");
        }

        applications.forEach(application -> application.setStatus(
                application.getId().equals(applicationId) ? ApplicationStatus.ACCEPTED : ApplicationStatus.REJECTED
        ));
        applicationRepository.saveAll(applications);
        order.setDesignerId(accepted.getDesigner().getId());
        order.setStatus(OrderStatus.IN_PROGRESS);
        orderRepository.save(order);
        financialService.hold(order);
        notificationService.notify(
                accepted.getDesigner().getId(),
                "Você foi escolhido para o Caso #" + orderId + "!",
                "O dentista aceitou sua candidatura. O caso já está disponível para produção.",
                "/orders/" + orderId
        );
        return orderService.getById(orderId, currentUser);
    }

    private Order getOrder(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));
    }

    private void requireOwner(Order order, AuthenticatedUser currentUser) {
        if (!currentUser.id().equals(order.getUserId())) {
            throw new AccessDeniedException("Order does not belong to this dentist");
        }
    }

    private void requireRole(AuthenticatedUser currentUser, UserRole role) {
        if (currentUser.role() != role) {
            throw new AccessDeniedException("This operation requires role " + role);
        }
    }

    private OrderApplicationResponse toResponse(OrderApplication application) {
        User designer = application.getDesigner();
        return new OrderApplicationResponse(
                application.getId(),
                application.getOrder().getId(),
                designer.getId(),
                designer.getName(),
                designer.getAvatarUrl(),
                application.getStatus(),
                application.getCreatedAt()
        );
    }
}
