package com.exomarket.service;

import com.exomarket.OrderStatus;
import com.exomarket.UserRole;
import com.exomarket.WalletTransactionStatus;
import com.exomarket.WalletTransactionType;
import com.exomarket.domain.Order;
import com.exomarket.domain.User;
import com.exomarket.domain.WalletTransaction;
import com.exomarket.dto.FinancialSummaryResponse;
import com.exomarket.dto.WalletTransactionResponse;
import com.exomarket.repository.UserRepository;
import com.exomarket.repository.WalletTransactionRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinancialService {

    private static final BigDecimal DESIGNER_SHARE = new BigDecimal("0.88");
    private static final BigDecimal PLATFORM_SHARE = new BigDecimal("0.12");
    private static final List<OrderStatus> ESCROW_STATUSES = List.of(
            OrderStatus.IN_PROGRESS,
            OrderStatus.IN_REVIEW,
            OrderStatus.REVISION_REQUESTED
    );

    private final WalletTransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public FinancialService(WalletTransactionRepository transactionRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public void hold(Order order) {
        createOnce(order, order.getUserId(), WalletTransactionType.ESCROW_HOLD, order.getTotalAmount());
    }

    @Transactional
    public void release(Order order) {
        if (order.getDesignerId() == null) {
            throw new IllegalStateException("Cannot release escrow without an assigned designer");
        }
        createOnce(order, order.getDesignerId(), WalletTransactionType.ESCROW_RELEASE,
                percentage(order.getTotalAmount(), DESIGNER_SHARE));
        createOnce(order, order.getDesignerId(), WalletTransactionType.PLATFORM_FEE,
                percentage(order.getTotalAmount(), PLATFORM_SHARE));
    }

    @Transactional
    public void refund(Order order) {
        createOnce(order, order.getUserId(), WalletTransactionType.ESCROW_REFUND, order.getTotalAmount());
    }

    @Transactional(readOnly = true)
    public FinancialSummaryResponse summary(AuthenticatedUser currentUser) {
        BigDecimal releases = sum(currentUser.id(), WalletTransactionType.ESCROW_RELEASE);
        BigDecimal refunds = sum(currentUser.id(), WalletTransactionType.ESCROW_REFUND);
        BigDecimal holds = sum(currentUser.id(), WalletTransactionType.ESCROW_HOLD);
        BigDecimal escrow = currentUser.role() == UserRole.DESIGNER
                ? transactionRepository.sumDesignerEscrow(currentUser.id(), ESCROW_STATUSES)
                : transactionRepository.sumDentistEscrow(currentUser.id(), ESCROW_STATUSES);
        BigDecimal total = currentUser.role() == UserRole.DESIGNER ? releases : holds.subtract(refunds);
        BigDecimal available = currentUser.role() == UserRole.DESIGNER ? releases : refunds;
        WalletTransactionType completedType = currentUser.role() == UserRole.DESIGNER
                ? WalletTransactionType.ESCROW_RELEASE
                : WalletTransactionType.ESCROW_HOLD;
        return new FinancialSummaryResponse(
                money(available),
                money(escrow),
                money(total.max(BigDecimal.ZERO)),
                transactionRepository.countByUserIdAndType(currentUser.id(), completedType)
        );
    }

    @Transactional(readOnly = true)
    public Page<WalletTransactionResponse> statement(AuthenticatedUser currentUser, int page, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return transactionRepository.findStatement(currentUser.id(), PageRequest.of(Math.max(page, 0), safeSize))
                .map(this::toResponse);
    }

    private void createOnce(Order order, Long userId, WalletTransactionType type, BigDecimal amount) {
        if (transactionRepository.existsByOrderIdAndType(order.getId(), type)) {
            return;
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found: " + userId));
        WalletTransaction transaction = new WalletTransaction();
        transaction.setOrder(order);
        transaction.setUser(user);
        transaction.setType(type);
        transaction.setAmount(money(amount));
        transaction.setStatus(WalletTransactionStatus.COMPLETED);
        transactionRepository.save(transaction);
    }

    private BigDecimal sum(Long userId, WalletTransactionType type) {
        return transactionRepository.sumByUserAndType(userId, type);
    }

    private BigDecimal percentage(BigDecimal amount, BigDecimal rate) {
        return amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private WalletTransactionResponse toResponse(WalletTransaction transaction) {
        return new WalletTransactionResponse(
                transaction.getId(),
                transaction.getOrder().getId(),
                transaction.getType(),
                transaction.getAmount(),
                transaction.getStatus(),
                transaction.getCreatedAt()
        );
    }
}
