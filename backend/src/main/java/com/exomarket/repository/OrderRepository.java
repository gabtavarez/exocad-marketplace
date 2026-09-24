package com.exomarket.repository;

import com.exomarket.domain.Order;
import com.exomarket.OrderStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatus(OrderStatus status);

    List<Order> findByUserId(Long userId);

    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);

    List<Order> findByDesignerId(Long designerId);

    List<Order> findByDesignerIdAndStatus(Long designerId, OrderStatus status);
}
