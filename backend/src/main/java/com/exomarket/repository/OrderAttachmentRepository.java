package com.exomarket.repository;

import com.exomarket.AttachmentStage;
import com.exomarket.domain.OrderAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderAttachmentRepository extends JpaRepository<OrderAttachment, Long> {

    @Query("""
            select count(attachment) > 0
            from OrderAttachment attachment
            where attachment.order.id = :orderId
              and attachment.attachmentStage = :stage
              and lower(attachment.originalFileName) like :fileNamePattern
            """)
    boolean existsByOrderIdAndStageAndFileNamePattern(
            @Param("orderId") Long orderId,
            @Param("stage") AttachmentStage stage,
            @Param("fileNamePattern") String fileNamePattern
    );
}
