package com.exomarket.repository;

import com.exomarket.domain.OrderMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderMessageRepository extends JpaRepository<OrderMessage, Long> {

    List<OrderMessage> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
