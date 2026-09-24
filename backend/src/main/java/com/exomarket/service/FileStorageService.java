package com.exomarket.service;

import com.exomarket.AttachmentStage;
import com.exomarket.UserRole;
import com.exomarket.config.StorageProperties;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderAttachment;
import com.exomarket.dto.CreateUploadUrlRequest;
import com.exomarket.dto.UploadUrlResponse;
import com.exomarket.repository.OrderAttachmentRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FileStorageService {

    private static final String SERVICE = "s3";
    private static final String ALGORITHM = "AWS4-HMAC-SHA256";

    private final StorageProperties storageProperties;
    private final OrderRepository orderRepository;
    private final OrderAttachmentRepository attachmentRepository;

    public FileStorageService(
            StorageProperties storageProperties,
            OrderRepository orderRepository,
            OrderAttachmentRepository attachmentRepository
    ) {
        this.storageProperties = storageProperties;
        this.orderRepository = orderRepository;
        this.attachmentRepository = attachmentRepository;
    }

    @Transactional
    public UploadUrlResponse createUploadUrl(
            Long orderId,
            CreateUploadUrlRequest request,
            AuthenticatedUser currentUser
    ) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new EntityNotFoundException("Order not found: " + orderId));

        validateUploadPermission(order, request.attachmentStage(), currentUser);
        validateSupportedFile(request.fileName(), request.attachmentStage());

        String storagePath = "orders/%d/%s-%s".formatted(
                orderId,
                OffsetDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")),
                UUID.randomUUID()
        );

        OrderAttachment attachment = new OrderAttachment();
        attachment.setOrder(order);
        attachment.setStoragePath(storagePath);
        attachment.setAttachmentStage(request.attachmentStage());
        attachment.setOriginalFileName(request.fileName());
        attachment.setMimeType(request.mimeType());
        attachment.setFileSize(request.size());
        attachment = attachmentRepository.save(attachment);

        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC)
                .plusMinutes(storageProperties.presignedUrlExpirationMinutes());

        return new UploadUrlResponse(
                attachment.getId(),
                buildPresignedPutUrl(storagePath, request.mimeType(), expiresAt),
                storagePath,
                expiresAt
        );
    }

    private void validateUploadPermission(
            Order order,
            AttachmentStage attachmentStage,
            AuthenticatedUser currentUser
    ) {
        boolean allowed = attachmentStage == AttachmentStage.CLINICAL_INPUT
                ? currentUser.role() == UserRole.DENTIST && currentUser.id().equals(order.getUserId())
                : currentUser.role() == UserRole.DESIGNER && currentUser.id().equals(order.getDesignerId());

        if (!allowed) {
            throw new AccessDeniedException("User cannot upload this attachment type for the order");
        }
    }

    private void validateSupportedFile(String fileName, AttachmentStage attachmentStage) {
        String lowerCaseName = fileName.toLowerCase();

        boolean supported = switch (attachmentStage) {
            case CLINICAL_INPUT -> lowerCaseName.endsWith(".stl") || lowerCaseName.endsWith(".ply");
            case CAD_DELIVERY -> lowerCaseName.endsWith(".stl")
                    || lowerCaseName.endsWith(".constructioninfo")
                    || lowerCaseName.endsWith(".html");
        };

        if (!supported) {
            throw new IllegalArgumentException("Unsupported file extension for " + attachmentStage);
        }
    }

    private String buildPresignedPutUrl(String storagePath, String mimeType, OffsetDateTime expiresAt) {
        URI endpoint = URI.create(storageProperties.publicEndpoint());
        String host = endpoint.getHost() + (endpoint.getPort() > -1 ? ":" + endpoint.getPort() : "");
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String amzDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String dateStamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String scope = "%s/%s/%s/aws4_request".formatted(dateStamp, storageProperties.region(), SERVICE);
        long expiresInSeconds = Math.max(1, expiresAt.toEpochSecond() - now.toEpochSecond());
        String credential = storageProperties.accessKey() + "/" + scope;
        String canonicalUri = "/" + storageProperties.bucket() + "/" + encodePath(storagePath);

        String canonicalQueryString = "X-Amz-Algorithm=%s&X-Amz-Credential=%s&X-Amz-Date=%s&X-Amz-Expires=%d&X-Amz-SignedHeaders=content-type%%3Bhost"
                .formatted(
                        ALGORITHM,
                        encodeQuery(credential),
                        amzDate,
                        expiresInSeconds
                );
        String canonicalHeaders = "content-type:%s\nhost:%s\n".formatted(mimeType, host);
        String canonicalRequest = "PUT\n%s\n%s\n%s\ncontent-type;host\nUNSIGNED-PAYLOAD"
                .formatted(canonicalUri, canonicalQueryString, canonicalHeaders);
        String stringToSign = "%s\n%s\n%s\n%s"
                .formatted(ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest));
        String signature = hmacSha256Hex(getSignatureKey(storageProperties.secretKey(), dateStamp), stringToSign);

        return "%s://%s%s?%s&X-Amz-Signature=%s"
                .formatted(endpoint.getScheme(), host, canonicalUri, canonicalQueryString, signature);
    }

    private String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/"))
                .map(this::encodeQuery)
                .reduce((left, right) -> left + "/" + right)
                .orElse("");
    }

    private String encodeQuery(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private String sha256Hex(String value) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private byte[] getSignatureKey(String key, String dateStamp) {
        byte[] dateKey = hmacSha256(("AWS4" + key).getBytes(StandardCharsets.UTF_8), dateStamp);
        byte[] dateRegionKey = hmacSha256(dateKey, storageProperties.region());
        byte[] dateRegionServiceKey = hmacSha256(dateRegionKey, SERVICE);
        return hmacSha256(dateRegionServiceKey, "aws4_request");
    }

    private String hmacSha256Hex(byte[] key, String data) {
        return HexFormat.of().formatHex(hmacSha256(key, data));
    }

    private byte[] hmacSha256(byte[] key, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (java.security.GeneralSecurityException exception) {
            throw new IllegalStateException("Unable to sign storage request", exception);
        }
    }
}
