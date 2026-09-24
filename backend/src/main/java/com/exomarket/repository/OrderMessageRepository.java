package com.exomarket.repository;

import com.exomarket.domain.OrderMessage;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderMessageRepository extends JpaRepository<OrderMessage, Long> {

    List<OrderMessage> findByOrderIdOrderByCreatedAtAsc(Long orderId);

    Optional<OrderMessage> findTopByOrderIdOrderByCreatedAtDesc(Long orderId);
}
