package com.skillpath.backend.domain;

import com.skillpath.backend.exception.BadRequestException;

public enum ValidationStatus {
    CONFIRMED,
    DISPUTED;

    public static ValidationStatus fromString(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new BadRequestException("Status is required and must be CONFIRMED or DISPUTED");
        }
        try {
            return ValidationStatus.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: '" + value + "'. Must be CONFIRMED or DISPUTED");
        }
    }
}
