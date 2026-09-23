package com.exomarket.controller;

import com.exomarket.OrderStatus;
import com.exomarket.dto.CreateOrderRequest;
import com.exomarket.dto.CreateUploadUrlRequest;
import com.exomarket.dto.OrderResponse;
import com.exomarket.dto.UploadUrlResponse;
import com.exomarket.service.FileStorageService;
import com.exomarket.service.OrderService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest request) {
        OrderResponse response = orderService.create(request);
        return ResponseEntity
                .created(URI.create("/api/orders/" + response.id()))
                .body(response);
    }

    @GetMapping
    public List<OrderResponse> list(@RequestParam(required = false) OrderStatus status) {
        return orderService.list(status);
    }

    @GetMapping("/{id}")
    public OrderResponse getById(@PathVariable Long id) {
        return orderService.getById(id);
    }

    @PostMapping("/{orderId}/upload-url")
    public UploadUrlResponse createUploadUrl(
            @PathVariable Long orderId,
            @Valid @RequestBody CreateUploadUrlRequest request
    ) {
        return fileStorageService.createUploadUrl(orderId, request);
    }
}
