package com.exomarket.service;

import com.exomarket.AttachmentStage;
import com.exomarket.UserRole;
import com.exomarket.config.StorageProperties;
import com.exomarket.domain.Order;
import com.exomarket.domain.OrderAttachment;
import com.exomarket.dto.AttachmentDownloadUrlResponse;
import com.exomarket.dto.AvatarUploadUrlResponse;
import com.exomarket.dto.CreateAvatarUploadUrlRequest;
import com.exomarket.dto.CreateUploadUrlRequest;
import com.exomarket.dto.UploadUrlResponse;
import com.exomarket.repository.OrderAttachmentRepository;
import com.exomarket.repository.OrderRepository;
import com.exomarket.security.AuthenticatedUser;
import jakarta.persistence.EntityNotFoundException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
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

    public AvatarUploadUrlResponse createAvatarUploadUrl(
            CreateAvatarUploadUrlRequest request,
            AuthenticatedUser currentUser
    ) {
        String extension = validateAvatarFile(request.fileName(), request.mimeType());
        String storagePath = "avatars/%d/%s%s".formatted(currentUser.id(), UUID.randomUUID(), extension);
        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC)
                .plusMinutes(storageProperties.presignedUrlExpirationMinutes());
        String uploadUrl = buildPresignedPutUrl(
                storageProperties.avatarBucket(), storagePath, request.mimeType(), expiresAt
        );
        URI publicEndpoint = URI.create(storageProperties.publicEndpoint());
        String endpointHost = endpointHost(publicEndpoint);
        String publicUrl = storageProperties.pathStyleAccess()
                ? "%s://%s/%s/%s".formatted(
                        publicEndpoint.getScheme(), endpointHost, storageProperties.avatarBucket(), encodePath(storagePath)
                )
                : "%s://%s.%s/%s".formatted(
                        publicEndpoint.getScheme(), storageProperties.avatarBucket(), endpointHost, encodePath(storagePath)
                );
        return new AvatarUploadUrlResponse(uploadUrl, publicUrl, expiresAt);
    }

    @Transactional
    public void completeUpload(Long orderId, Long attachmentId, AuthenticatedUser currentUser) {
        OrderAttachment attachment = getAttachment(orderId, attachmentId);
        validateUploadPermission(attachment.getOrder(), attachment.getAttachmentStage(), currentUser);
        attachment.setUploaded(true);
        attachmentRepository.save(attachment);
    }

    @Transactional(readOnly = true)
    public AttachmentDownloadUrlResponse createDownloadUrl(
            Long orderId,
            Long attachmentId,
            AuthenticatedUser currentUser
    ) {
        OrderAttachment attachment = getAttachment(orderId, attachmentId);
        validateDownloadPermission(attachment.getOrder(), currentUser);

        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC)
                .plusMinutes(storageProperties.presignedUrlExpirationMinutes());

        return new AttachmentDownloadUrlResponse(
                attachment.getId(),
                buildPresignedGetUrl(
                        attachment.getStoragePath(), attachment.getOriginalFileName(), "attachment", expiresAt
                ),
                buildPresignedGetUrl(
                        attachment.getStoragePath(), attachment.getOriginalFileName(), "inline", expiresAt
                ),
                expiresAt
        );
    }

    @Transactional
    public void deleteDeliveryAttachment(Long orderId, Long attachmentId, AuthenticatedUser currentUser) {
        OrderAttachment attachment = getAttachment(orderId, attachmentId);
        Order order = attachment.getOrder();
        boolean editableStatus = order.getStatus() == com.exomarket.OrderStatus.IN_PROGRESS
                || order.getStatus() == com.exomarket.OrderStatus.REVISION_REQUESTED;
        boolean allowed = currentUser.role() == UserRole.DESIGNER
                && currentUser.id().equals(order.getDesignerId())
                && attachment.getAttachmentStage() == AttachmentStage.CAD_DELIVERY
                && editableStatus;
        if (!allowed) {
            throw new AccessDeniedException("Only the assigned designer can replace a delivery before review");
        }

        if (Boolean.TRUE.equals(attachment.getUploaded())) {
            deleteStorageObject(attachment.getStoragePath());
        }
        attachmentRepository.delete(attachment);
    }

    private OrderAttachment getAttachment(Long orderId, Long attachmentId) {
        OrderAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new EntityNotFoundException("Attachment not found: " + attachmentId));

        if (!attachment.getOrder().getId().equals(orderId)) {
            throw new EntityNotFoundException("Attachment not found: " + attachmentId);
        }

        return attachment;
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

    private void validateDownloadPermission(Order order, AuthenticatedUser currentUser) {
        boolean allowed = currentUser.role() == UserRole.DENTIST
                ? currentUser.id().equals(order.getUserId())
                : order.getStatus() == com.exomarket.OrderStatus.OPEN
                        || currentUser.id().equals(order.getDesignerId());

        if (!allowed) {
            throw new AccessDeniedException("User cannot download attachments for the order");
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

    private String validateAvatarFile(String fileName, String mimeType) {
        String lowerCaseName = fileName.toLowerCase();
        return switch (mimeType.toLowerCase()) {
            case "image/jpeg" -> {
                if (!lowerCaseName.endsWith(".jpg") && !lowerCaseName.endsWith(".jpeg")) {
                    throw new IllegalArgumentException("The avatar extension does not match its image type");
                }
                yield ".jpg";
            }
            case "image/png" -> {
                if (!lowerCaseName.endsWith(".png")) {
                    throw new IllegalArgumentException("The avatar extension does not match its image type");
                }
                yield ".png";
            }
            case "image/webp" -> {
                if (!lowerCaseName.endsWith(".webp")) {
                    throw new IllegalArgumentException("The avatar extension does not match its image type");
                }
                yield ".webp";
            }
            default -> throw new IllegalArgumentException("Use a JPG, PNG or WebP image for the avatar");
        };
    }

    private String buildPresignedPutUrl(String storagePath, String mimeType, OffsetDateTime expiresAt) {
        return buildPresignedPutUrl(storageProperties.bucket(), storagePath, mimeType, expiresAt);
    }

    private String buildPresignedPutUrl(
            String bucket,
            String storagePath,
            String mimeType,
            OffsetDateTime expiresAt
    ) {
        return buildPresignedUrl("PUT", bucket, storagePath, mimeType, expiresAt);
    }

    private String buildPresignedGetUrl(
            String storagePath,
            String fileName,
            String disposition,
            OffsetDateTime expiresAt
    ) {
        String safeFileName = fileName.replace("\"", "");
        String contentDisposition = "%s; filename=\"%s\"".formatted(disposition, safeFileName);
        return buildPresignedUrl(
                "GET",
                storageProperties.bucket(),
                storagePath,
                null,
                expiresAt,
                storageProperties.publicEndpoint(),
                Map.of("response-content-disposition", contentDisposition)
        );
    }

    private String buildPresignedUrl(String method, String storagePath, String mimeType, OffsetDateTime expiresAt) {
        return buildPresignedUrl(method, storageProperties.bucket(), storagePath, mimeType, expiresAt);
    }

    private String buildPresignedUrl(
            String method,
            String bucket,
            String storagePath,
            String mimeType,
            OffsetDateTime expiresAt
    ) {
        return buildPresignedUrl(
                method, bucket, storagePath, mimeType, expiresAt, storageProperties.publicEndpoint(), Map.of()
        );
    }

    private String buildPresignedUrl(
            String method,
            String bucket,
            String storagePath,
            String mimeType,
            OffsetDateTime expiresAt,
            String endpointValue,
            Map<String, String> extraQueryParameters
    ) {
        URI endpoint = URI.create(endpointValue);
        String endpointHost = endpointHost(endpoint);
        String host = storageProperties.pathStyleAccess()
                ? endpointHost
                : bucket + "." + endpointHost;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        String amzDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String dateStamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String scope = "%s/%s/%s/aws4_request".formatted(dateStamp, storageProperties.region(), SERVICE);
        long expiresInSeconds = Math.max(1, expiresAt.toEpochSecond() - now.toEpochSecond());
        String credential = storageProperties.accessKey() + "/" + scope;
        String canonicalUri = storageProperties.pathStyleAccess()
                ? "/" + bucket + "/" + encodePath(storagePath)
                : "/" + encodePath(storagePath);
        Map<String, String> queryParameters = new TreeMap<>();
        queryParameters.put("X-Amz-Algorithm", ALGORITHM);
        queryParameters.put("X-Amz-Credential", credential);
        queryParameters.put("X-Amz-Date", amzDate);
        queryParameters.put("X-Amz-Expires", Long.toString(expiresInSeconds));
        queryParameters.put("X-Amz-SignedHeaders", canonicalSignedHeaders(method));
        queryParameters.putAll(extraQueryParameters);
        String canonicalQueryString = queryParameters.entrySet().stream()
                .map(entry -> encodeQuery(entry.getKey()) + "=" + encodeQuery(entry.getValue()))
                .reduce((left, right) -> left + "&" + right)
                .orElse("");
        String canonicalSignedHeaders = canonicalSignedHeaders(method);
        String canonicalHeaders = "host".equals(canonicalSignedHeaders)
                ? "host:%s\n".formatted(host)
                : "content-type:%s\nhost:%s\n".formatted(mimeType, host);
        String canonicalRequest = "%s\n%s\n%s\n%s\n%s\nUNSIGNED-PAYLOAD"
                .formatted(method, canonicalUri, canonicalQueryString, canonicalHeaders, canonicalSignedHeaders);
        String stringToSign = "%s\n%s\n%s\n%s"
                .formatted(ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest));
        String signature = hmacSha256Hex(getSignatureKey(storageProperties.secretKey(), dateStamp), stringToSign);

        return "%s://%s%s?%s&X-Amz-Signature=%s"
                .formatted(endpoint.getScheme(), host, canonicalUri, canonicalQueryString, signature);
    }

    private String canonicalSignedHeaders(String method) {
        return "GET".equals(method) || "DELETE".equals(method) ? "host" : "content-type;host";
    }

    private void deleteStorageObject(String storagePath) {
        OffsetDateTime expiresAt = OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(1);
        String deleteUrl = buildPresignedUrl(
                "DELETE",
                storageProperties.bucket(),
                storagePath,
                null,
                expiresAt,
                storageProperties.endpoint(),
                Map.of()
        );
        try {
            HttpResponse<Void> response = HttpClient.newHttpClient().send(
                    HttpRequest.newBuilder(URI.create(deleteUrl)).DELETE().build(),
                    HttpResponse.BodyHandlers.discarding()
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Storage rejected attachment deletion");
            }
        } catch (java.io.IOException exception) {
            throw new IllegalStateException("Unable to delete attachment from storage", exception);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Attachment deletion was interrupted", exception);
        }
    }

    private String encodePath(String path) {
        return java.util.Arrays.stream(path.split("/"))
                .map(this::encodeQuery)
                .reduce((left, right) -> left + "/" + right)
                .orElse("");
    }

    private String endpointHost(URI endpoint) {
        return endpoint.getHost() + (endpoint.getPort() > -1 ? ":" + endpoint.getPort() : "");
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
