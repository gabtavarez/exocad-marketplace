package com.exomarket.service;

import com.exomarket.AttachmentStage;
import com.exomarket.OrderStatus;
import com.exomarket.UserRole;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderItem;
import com.exomarket.dto.CreateOrderRequest;
import com.exomarket.dto.OrderResponse;
import com.exomarket.repository.OrderAttachmentRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final BigDecimal MOCK_PRICE_PER_ITEM = new BigDecimal("150.00");

    private final OrderRepository orderRepository;
    private final OrderAttachmentRepository orderAttachmentRepository;

    public OrderService(OrderRepository orderRepository, OrderAttachmentRepository orderAttachmentRepository) {
        this.orderRepository = orderRepository;
        this.orderAttachmentRepository = orderAttachmentRepository;
    }

    @Transactional
    public OrderResponse create(CreateOrderRequest request, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DENTIST);
        validateToothNumbers(request.items());

        Order order = new Order();
        order.setUserId(currentUser.id());
        order.setStatus(OrderStatus.OPEN);
        order.setTitle(request.title());
        order.setDescription(request.description());
        order.setTotalAmount(calculateTotalAmount(request.items()));

        request.items().forEach(itemRequest -> {
            OrderItem item = new OrderItem();
            item.setToothNumber(itemRequest.toothNumber());
            item.setServiceType(itemRequest.serviceType());
            item.setNotes(itemRequest.notes());
            order.addItem(item);
        });

        return toResponse(orderRepository.save(order));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> list(OrderStatus status, AuthenticatedUser currentUser) {
        List<Order> orders;
        if (currentUser.role() == UserRole.DENTIST) {
            orders = status == null
                    ? orderRepository.findByUserId(currentUser.id())
                    : orderRepository.findByUserIdAndStatus(currentUser.id(), status);
        } else if (status == null) {
            orders = new ArrayList<>(orderRepository.findByStatus(OrderStatus.OPEN));
            orders.addAll(orderRepository.findByDesignerIdAndStatus(currentUser.id(), OrderStatus.IN_PROGRESS));
        } else if (status == OrderStatus.OPEN) {
            orders = orderRepository.findByStatus(OrderStatus.OPEN);
        } else if (status == OrderStatus.IN_PROGRESS) {
            orders = orderRepository.findByDesignerIdAndStatus(currentUser.id(), OrderStatus.IN_PROGRESS);
        } else {
            orders = List.of();
        }

        return orders.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getById(Long id, AuthenticatedUser currentUser) {
        Order order = getOrderOrThrow(id);
        requireCanView(order, currentUser);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse accept(Long id, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DESIGNER);
        Order order = getOrderOrThrow(id);
        transition(order, OrderStatus.OPEN, OrderStatus.IN_PROGRESS);
        order.setDesignerId(currentUser.id());
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse submitDelivery(Long id, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DESIGNER);
        Order order = getOrderOrThrow(id);
        requireDesigner(order, currentUser);
        transition(order, OrderStatus.IN_PROGRESS, OrderStatus.IN_REVIEW);
        if (!hasCadDeliveryStl(id)) {
            throw new IllegalStateException("Cannot submit delivery without a CAD delivery STL");
        }
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse approve(Long id, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DENTIST);
        Order order = getOrderOrThrow(id);
        requireOwner(order, currentUser);
        transition(order, OrderStatus.IN_REVIEW, OrderStatus.COMPLETED);
        if (!hasCadDeliveryStl(id)) {
            throw new IllegalStateException("Cannot approve an order without a CAD delivery STL");
        }
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse requestRevision(Long id, String feedback, AuthenticatedUser currentUser) {
        requireRole(currentUser, UserRole.DENTIST);
        Order order = getOrderOrThrow(id);
        requireOwner(order, currentUser);
        transition(order, OrderStatus.IN_REVIEW, OrderStatus.REVISION_REQUESTED);
        order.setRevisionFeedback(feedback);
        return toResponse(orderRepository.save(order));
    }

    private Order getOrderOrThrow(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));
    }

    private void requireCanView(Order order, AuthenticatedUser currentUser) {
        if (currentUser.role() == UserRole.DENTIST) {
            requireOwner(order, currentUser);
        } else if (order.getStatus() != OrderStatus.OPEN && !currentUser.id().equals(order.getDesignerId())) {
            throw new AccessDeniedException("Order is not available to this designer");
        }
    }

    private void requireOwner(Order order, AuthenticatedUser currentUser) {
        if (!currentUser.id().equals(order.getUserId())) {
            throw new AccessDeniedException("Order does not belong to this dentist");
        }
    }

    private void requireDesigner(Order order, AuthenticatedUser currentUser) {
        if (!currentUser.id().equals(order.getDesignerId())) {
            throw new AccessDeniedException("Order is assigned to another designer");
        }
    }

    private void requireRole(AuthenticatedUser currentUser, UserRole role) {
        if (currentUser.role() != role) {
            throw new AccessDeniedException("This operation requires role " + role);
        }
    }

    private void transition(Order order, OrderStatus expected, OrderStatus next) {
        if (order.getStatus() != expected) {
            throw new IllegalStateException("Invalid status transition from " + order.getStatus() + " to " + next);
        }
        order.setStatus(next);
    }

    private boolean hasCadDeliveryStl(Long orderId) {
        return orderAttachmentRepository.existsByOrderIdAndStageAndFileNamePattern(
                orderId,
                AttachmentStage.CAD_DELIVERY,
                "%.stl"
        );
    }

    private BigDecimal calculateTotalAmount(List<CreateOrderRequest.CreateOrderItemRequest> items) {
        return MOCK_PRICE_PER_ITEM.multiply(BigDecimal.valueOf(items.size()));
    }

    private void validateToothNumbers(List<CreateOrderRequest.CreateOrderItemRequest> items) {
        items.stream()
                .map(CreateOrderRequest.CreateOrderItemRequest::toothNumber)
                .filter(toothNumber -> toothNumber == null || !isValidFdiToothNumber(toothNumber))
                .findFirst()
                .ifPresent(toothNumber -> {
                    throw new IllegalArgumentException("Invalid FDI tooth number: " + toothNumber);
                });
    }

    private boolean isValidFdiToothNumber(Integer toothNumber) {
        int quadrant = toothNumber / 10;
        int position = toothNumber % 10;
        return quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8;
    }

    private OrderResponse toResponse(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getUserId(),
                order.getDesignerId(),
                order.getStatus(),
                order.getTitle(),
                order.getDescription(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getItems().stream()
                        .map(item -> new OrderResponse.OrderItemResponse(
                                item.getId(), item.getToothNumber(), item.getServiceType(), item.getNotes()
                        ))
                        .toList()
        );
    }
}
