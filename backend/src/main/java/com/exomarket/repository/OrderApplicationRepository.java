package com.exomarket.repository;

import com.exomarket.domain.OrderApplication;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderApplicationRepository extends JpaRepository<OrderApplication, Long> {

    Optional<OrderApplication> findByOrderIdAndDesignerId(Long orderId, Long designerId);

    List<OrderApplication> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
