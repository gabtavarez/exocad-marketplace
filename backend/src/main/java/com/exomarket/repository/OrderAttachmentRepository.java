package com.exomarket.repository;

import com.exomarket.domain.OrderAttachment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderAttachmentRepository extends JpaRepository<OrderAttachment, Long> {
}
