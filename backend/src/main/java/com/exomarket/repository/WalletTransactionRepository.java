package com.exomarket.repository;

import com.exomarket.OrderStatus;
import com.exomarket.WalletTransactionType;
import com.exomarket.domain.WalletTransaction;
import java.math.BigDecimal;
import java.util.Collection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    @Modifying
    @Query(value = """
            insert into wallet_transactions (order_id, user_id, type, amount, status)
            values (:orderId, :userId, :type, :amount, 'COMPLETED')
            on conflict on constraint uk_wallet_transactions_order_type do nothing
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("orderId") Long orderId,
            @Param("userId") Long userId,
            @Param("type") String type,
            @Param("amount") BigDecimal amount
    );

    @Query("""
            select transaction from WalletTransaction transaction
            where transaction.user.id = :userId
               or (transaction.type = com.exomarket.WalletTransactionType.ESCROW_HOLD
                   and transaction.order.designerId = :userId)
            order by transaction.createdAt desc, transaction.id desc
            """)
    Page<WalletTransaction> findStatement(@Param("userId") Long userId, Pageable pageable);

    @Query("""
            select coalesce(sum(transaction.amount), 0) from WalletTransaction transaction
            where transaction.user.id = :userId and transaction.type = :type
            """)
    BigDecimal sumByUserAndType(
            @Param("userId") Long userId,
            @Param("type") WalletTransactionType type
    );

    @Query("""
            select coalesce(sum(transaction.amount), 0) from WalletTransaction transaction
            where transaction.type = com.exomarket.WalletTransactionType.ESCROW_HOLD
              and transaction.order.userId = :userId
              and transaction.order.status in :statuses
            """)
    BigDecimal sumDentistEscrow(
            @Param("userId") Long userId,
            @Param("statuses") Collection<OrderStatus> statuses
    );

    @Query("""
            select coalesce(sum(transaction.amount), 0) from WalletTransaction transaction
            where transaction.type = com.exomarket.WalletTransactionType.ESCROW_HOLD
              and transaction.order.designerId = :userId
              and transaction.order.status in :statuses
            """)
    BigDecimal sumDesignerEscrow(
            @Param("userId") Long userId,
            @Param("statuses") Collection<OrderStatus> statuses
    );

    long countByUserIdAndType(Long userId, WalletTransactionType type);
}
