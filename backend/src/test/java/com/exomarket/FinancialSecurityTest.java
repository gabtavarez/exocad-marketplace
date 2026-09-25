package com.exomarket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.only;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.exomarket.domain.Order;
import com.exomarket.domain.User;
import com.exomarket.repository.OrderApplicationRepository;
import com.exomarket.repository.OrderAttachmentRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.repository.UserRepository;
import com.exomarket.repository.WalletTransactionRepository;
import com.exomarket.security.AuthenticatedUser;
import com.exomarket.service.FinancialService;
import com.exomarket.service.NotificationService;
import com.exomarket.service.OrderService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class FinancialSecurityTest {

    @Mock
    private WalletTransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderAttachmentRepository orderAttachmentRepository;

    @Mock
    private OrderApplicationRepository orderApplicationRepository;

    @Mock
    private NotificationService notificationService;

    @Captor
    private ArgumentCaptor<BigDecimal> amountCaptor;

    @Test
    void releaseIsIdempotentUnderConcurrentDoubleClick() throws Exception {
        FinancialService financialService = new FinancialService(transactionRepository, userRepository);
        Order order = order(10L, 1L, 2L, OrderStatus.IN_REVIEW, "250.00");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.DESIGNER)));
        AtomicInteger releaseInsertions = new AtomicInteger();
        AtomicInteger feeInsertions = new AtomicInteger();
        when(transactionRepository.insertIfAbsent(eq(10L), eq(2L), eq("ESCROW_RELEASE"), any(BigDecimal.class)))
                .thenAnswer(invocation -> releaseInsertions.compareAndSet(0, 1) ? 1 : 0);
        when(transactionRepository.insertIfAbsent(eq(10L), eq(2L), eq("PLATFORM_FEE"), any(BigDecimal.class)))
                .thenAnswer(invocation -> feeInsertions.compareAndSet(0, 1) ? 1 : 0);

        runConcurrently(12, () -> financialService.release(order));

        assertThat(releaseInsertions).hasValue(1);
        assertThat(feeInsertions).hasValue(1);
        verify(transactionRepository, never()).save(any());
    }

    @Test
    void approvingSameOrderConcurrentlyReleasesEscrowOnlyOnce() throws Exception {
        FinancialService financialService = new FinancialService(transactionRepository, userRepository);
        OrderService orderService = new OrderService(
                orderRepository,
                orderAttachmentRepository,
                orderApplicationRepository,
                financialService,
                notificationService
        );
        Order order = order(20L, 1L, 2L, OrderStatus.IN_REVIEW, "300.00");
        AuthenticatedUser dentist = new AuthenticatedUser(1L, "dentist@example.com", UserRole.DENTIST);
        when(orderRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(order));
        when(orderAttachmentRepository.existsByOrderIdAndStageAndFileNamePattern(
                eq(20L), eq(AttachmentStage.CAD_DELIVERY), eq("%.stl")
        )).thenReturn(true);
        when(orderRepository.save(order)).thenReturn(order);
        when(userRepository.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.DESIGNER)));
        AtomicInteger releaseInsertions = new AtomicInteger();
        AtomicInteger feeInsertions = new AtomicInteger();
        when(transactionRepository.insertIfAbsent(eq(20L), eq(2L), eq("ESCROW_RELEASE"), any(BigDecimal.class)))
                .thenAnswer(invocation -> releaseInsertions.compareAndSet(0, 1) ? 1 : 0);
        when(transactionRepository.insertIfAbsent(eq(20L), eq(2L), eq("PLATFORM_FEE"), any(BigDecimal.class)))
                .thenAnswer(invocation -> feeInsertions.compareAndSet(0, 1) ? 1 : 0);

        runConcurrently(10, () -> {
            try {
                orderService.approve(20L, dentist);
            } catch (IllegalStateException ignored) {
                // Concurrent clicks after the first successful transition must be rejected.
            }
        });

        assertThat(order.getStatus()).isEqualTo(OrderStatus.COMPLETED);
        assertThat(releaseInsertions).hasValue(1);
        assertThat(feeInsertions).hasValue(1);
        verify(orderRepository, atLeastOnce()).findByIdForUpdate(20L);
    }

    @Test
    void releaseSplitKeepsEveryCentOnOddAmounts() {
        FinancialService financialService = new FinancialService(transactionRepository, userRepository);
        Order order = order(30L, 1L, 2L, OrderStatus.IN_REVIEW, "100.01");
        when(userRepository.findById(2L)).thenReturn(Optional.of(user(2L, UserRole.DESIGNER)));
        when(transactionRepository.insertIfAbsent(eq(30L), eq(2L), any(), amountCaptor.capture()))
                .thenReturn(1);

        financialService.release(order);

        List<BigDecimal> amounts = amountCaptor.getAllValues();
        assertThat(amounts).containsExactly(new BigDecimal("88.01"), new BigDecimal("12.00"));
        assertThat(amounts.get(0).add(amounts.get(1))).isEqualByComparingTo("100.01");
    }

    @Test
    void statementUsesOnlyAuthenticatedUserId() {
        FinancialService financialService = new FinancialService(transactionRepository, userRepository);
        AuthenticatedUser currentUser = new AuthenticatedUser(7L, "designer@example.com", UserRole.DESIGNER);
        when(transactionRepository.findStatement(eq(7L), any(PageRequest.class))).thenReturn(Page.empty());

        financialService.statement(currentUser, 0, 25);

        verify(transactionRepository, only()).findStatement(eq(7L), any(PageRequest.class));
    }

    @Test
    void designerCannotApproveAnotherUsersOrder() {
        OrderService orderService = new OrderService(
                orderRepository,
                orderAttachmentRepository,
                orderApplicationRepository,
                new FinancialService(transactionRepository, userRepository),
                notificationService
        );

        assertThatThrownBy(() -> orderService.approve(
                40L,
                new AuthenticatedUser(2L, "designer@example.com", UserRole.DESIGNER)
        )).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(orderRepository, never()).findByIdForUpdate(any());
        verify(transactionRepository, never()).insertIfAbsent(any(), any(), any(), any());
    }

    private void runConcurrently(int workers, ThrowingRunnable task) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(workers);
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new java.util.ArrayList<>();
        try {
            for (int i = 0; i < workers; i++) {
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    start.await(5, TimeUnit.SECONDS);
                    task.run();
                    return null;
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            for (Future<?> future : futures) {
                future.get(10, TimeUnit.SECONDS);
            }
        } finally {
            executor.shutdown();
            assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();
        }
    }

    private Order order(Long id, Long userId, Long designerId, OrderStatus status, String totalAmount) {
        Order order = new Order();
        order.setId(id);
        order.setUserId(userId);
        order.setDesignerId(designerId);
        order.setStatus(status);
        order.setTitle("Caso #" + id);
        order.setTotalAmount(new BigDecimal(totalAmount));
        return order;
    }

    private User user(Long id, UserRole role) {
        User user = new User();
        user.setId(id);
        user.setName("User " + id);
        user.setEmail("user" + id + "@example.com");
        user.setRole(role);
        return user;
    }

    @FunctionalInterface
    private interface ThrowingRunnable {
        void run() throws Exception;
    }
}
