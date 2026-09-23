package com.exomarket.service;

import com.exomarket.AttachmentStage;
import com.exomarket.OrderStatus;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderItem;
import com.exomarket.dto.CreateOrderRequest;
import com.exomarket.dto.OrderResponse;
import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.OrderAttachmentRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.List;
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
    public OrderResponse create(CreateOrderRequest request) {
        validateToothNumbers(request.items());

        Order order = new Order();
        order.setUserId(request.userId());
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
    public List<OrderResponse> list(OrderStatus status) {
        List<Order> orders = status == null
                ? orderRepository.findAll()
                : orderRepository.findByStatus(status);

        return orders.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse getById(Long id) {
        return orderRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));
    }

    @Transactional
    public OrderResponse accept(Long id) {
        Order order = getOrderOrThrow(id);
        transition(order, OrderStatus.OPEN, OrderStatus.IN_PROGRESS);
        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse submitDelivery(Long id) {
        Order order = getOrderOrThrow(id);
        transition(order, OrderStatus.IN_PROGRESS, OrderStatus.IN_REVIEW);

        if (!hasCadDeliveryStl(id)) {
            throw new IllegalStateException("Cannot submit delivery without a CAD delivery STL");
        }

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse approve(Long id) {
        Order order = getOrderOrThrow(id);
        transition(order, OrderStatus.IN_REVIEW, OrderStatus.COMPLETED);

        if (!hasCadDeliveryStl(id)) {
            throw new IllegalStateException("Cannot approve an order without a CAD delivery STL");
        }

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public OrderResponse requestRevision(Long id, String feedback) {
        Order order = getOrderOrThrow(id);
        transition(order, OrderStatus.IN_REVIEW, OrderStatus.REVISION_REQUESTED);
        order.setRevisionFeedback(feedback);
        return toResponse(orderRepository.save(order));
    }

    private Order getOrderOrThrow(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + id));
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
                order.getStatus(),
                order.getTitle(),
                order.getDescription(),
                order.getTotalAmount(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getItems().stream()
                        .map(item -> new OrderResponse.OrderItemResponse(
                                item.getId(),
                                item.getToothNumber(),
                                item.getServiceType(),
                                item.getNotes()
                        ))
                        .toList()
        );
    }
}
