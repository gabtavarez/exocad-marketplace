package com.exomarket.controller;

import com.exomarket.OrderStatus;
import com.exomarket.dto.AttachmentDownloadUrlResponse;
import com.exomarket.dto.CreateOrderRequest;
import com.exomarket.dto.CreateUploadUrlRequest;
import com.exomarket.dto.OrderResponse;
import com.exomarket.dto.RequestRevisionRequest;
import com.exomarket.dto.UploadUrlResponse;
import com.exomarket.service.FileStorageService;
import com.exomarket.service.OrderService;
import com.exomarket.security.AuthenticatedUser;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final FileStorageService fileStorageService;

    public OrderController(OrderService orderService, FileStorageService fileStorageService) {
        this.orderService = orderService;
        this.fileStorageService = fileStorageService;
    }

    @PostMapping
    public ResponseEntity<OrderResponse> create(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        OrderResponse response = orderService.create(request, currentUser);
        return ResponseEntity
                .created(URI.create("/api/orders/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<OrderResponse> list(
            @RequestParam(required = false) OrderStatus status,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return orderService.list(status, currentUser);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return orderService.getById(id, currentUser);
    }

    @PostMapping("/{id}/accept")
    public OrderResponse accept(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return orderService.accept(id, currentUser);
    }

    @PostMapping("/{id}/submit-delivery")
    public OrderResponse submitDelivery(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return orderService.submitDelivery(id, currentUser);
    }

    @PostMapping("/{id}/approve")
    public OrderResponse approve(@PathVariable Long id, @AuthenticationPrincipal AuthenticatedUser currentUser) {
        return orderService.approve(id, currentUser);
    }

    @PostMapping("/{id}/request-revision")
    public OrderResponse requestRevision(
            @PathVariable Long id,
            @Valid @RequestBody RequestRevisionRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return orderService.requestRevision(id, request.feedback(), currentUser);
    }

    @PostMapping("/{orderId}/upload-url")
    public UploadUrlResponse createUploadUrl(
            @PathVariable Long orderId,
            @Valid @RequestBody CreateUploadUrlRequest request,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return fileStorageService.createUploadUrl(orderId, request, currentUser);
    }

    @PostMapping("/{orderId}/attachments/{attachmentId}/complete")
    public ResponseEntity<Void> completeUpload(
            @PathVariable Long orderId,
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        fileStorageService.completeUpload(orderId, attachmentId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{orderId}/attachments/{attachmentId}/download-url")
    public AttachmentDownloadUrlResponse createDownloadUrl(
            @PathVariable Long orderId,
            @PathVariable Long attachmentId,
            @AuthenticationPrincipal AuthenticatedUser currentUser
    ) {
        return fileStorageService.createDownloadUrl(orderId, attachmentId, currentUser);
    }
}
