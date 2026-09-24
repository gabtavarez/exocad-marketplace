package com.exomarket.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank String title,
        String description,
        @NotEmpty List<@Valid CreateOrderItemRequest> items
) {

    public record CreateOrderItemRequest(
            @NotNull @Min(11) @Max(48) Integer toothNumber,
            @NotBlank String serviceType,
            String notes
    ) {
    }
}
