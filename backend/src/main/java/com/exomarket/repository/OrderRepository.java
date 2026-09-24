package com.exomarket.repository;

import com.exomarket.domain.Order;
import com.exomarket.OrderStatus;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByStatus(OrderStatus status);

    List<Order> findByUserId(Long userId);

    List<Order> findByUserIdAndStatus(Long userId, OrderStatus status);

    List<Order> findByDesignerId(Long designerId);

    List<Order> findByDesignerIdAndStatus(Long designerId, OrderStatus status);

    @Query("""
            select orders from Order orders
            where orders.designerId is not null
              and (orders.userId = :userId or orders.designerId = :userId)
              and (
                    orders.status in (com.exomarket.OrderStatus.IN_PROGRESS,
                                      com.exomarket.OrderStatus.IN_REVIEW,
                                      com.exomarket.OrderStatus.REVISION_REQUESTED)
                    or exists (select message.id from OrderMessage message where message.order = orders)
              )
            """)
    List<Order> findConversationOrders(@Param("userId") Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select orders from Order orders where orders.id = :id")
    Optional<Order> findByIdForUpdate(@Param("id") Long id);
}
