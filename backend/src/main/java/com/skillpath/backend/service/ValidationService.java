package com.skillpath.backend.service;

import com.skillpath.backend.domain.EmployerValidation;
import com.skillpath.backend.domain.ValidationStatus;
import com.skillpath.backend.dto.ValidationRequest;
import com.skillpath.backend.dto.ValidationResponse;
import com.skillpath.backend.dto.ValidationSummaryItem;
import com.skillpath.backend.exception.BadRequestException;
import com.skillpath.backend.exception.ResourceNotFoundException;
import com.skillpath.backend.exception.TooManyRequestsException;
import com.skillpath.backend.repository.EmployerValidationRepository;
import com.skillpath.backend.repository.RoleRepository;
import com.skillpath.backend.repository.SkillRepository;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ValidationService {

    private final EmployerValidationRepository employerValidationRepository;
    private final RoleRepository roleRepository;
    private final SkillRepository skillRepository;
    private final JdbcTemplate jdbcTemplate;
    private final int maxTotal;

    public ValidationService(
        EmployerValidationRepository employerValidationRepository,
        RoleRepository roleRepository,
        SkillRepository skillRepository,
        JdbcTemplate jdbcTemplate,
        @Value("${skillpath.validations.max-total:2000}") int maxTotal
    ) {
        this.employerValidationRepository = employerValidationRepository;
        this.roleRepository = roleRepository;
        this.skillRepository = skillRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.maxTotal = maxTotal;
    }

    /**
     * Confidence formula:
     * confidence = (confirmed + 1) / (confirmed + disputed + 2)
     *
     * With 0 validations, yields (0 + 1) / (0 + 0 + 2) = 0.5.
     * With 1 confirm: (1 + 1) / (1 + 0 + 2) = 2/3 = 0.667.
     * With 1 dispute: (0 + 1) / (0 + 1 + 2) = 1/3 = 0.333.
     * With 3 confirm, 1 dispute: (3 + 1) / (3 + 1 + 2) = 4/6 = 0.667.
     * Always strictly between 0 and 1. Rounded to 3 decimal places.
     */
    public static double calculateConfidence(long confirmed, long disputed) {
        double raw = (double) (confirmed + 1) / (double) (confirmed + disputed + 2);
        return Math.round(raw * 1000.0) / 1000.0;
    }

    @Transactional
    public ValidationResponse createValidation(ValidationRequest request) {
        if (request == null) {
            throw new BadRequestException("Request body cannot be null");
        }
        if (request.roleId() == null) {
            throw new BadRequestException("roleId is required");
        }
        if (request.skillId() == null) {
            throw new BadRequestException("skillId is required");
        }

        // Validate status as enum (CONFIRMED or DISPUTED, case-insensitive)
        ValidationStatus validationStatus = ValidationStatus.fromString(request.status());
        String statusStr = validationStatus.name();

        // Length-check note (optional, max 500 chars) and ensure stored as plain text
        String note = request.note();
        if (note != null && note.length() > 500) {
            throw new BadRequestException("Note must not exceed 500 characters");
        }

        // Abuse protection: hard cap on total stored validations
        long totalValidations = employerValidationRepository.count();
        if (totalValidations >= maxTotal) {
            throw new TooManyRequestsException("Maximum total validations limit reached (" + maxTotal + ")");
        }

        // Validate foreign keys: unknown role or skill yields 404
        if (!roleRepository.existsById(request.roleId())) {
            throw new ResourceNotFoundException("Role not found: " + request.roleId());
        }
        if (!skillRepository.existsById(request.skillId())) {
            throw new ResourceNotFoundException("Skill not found: " + request.skillId());
        }

        // Persist record
        EmployerValidation entity = new EmployerValidation();
        entity.setRoleId(request.roleId());
        entity.setSkillId(request.skillId());
        entity.setStatus(statusStr);
        entity.setNote(note);
        EmployerValidation saved = employerValidationRepository.save(entity);

        // Compute updated confidence for that (roleId, skillId)
        String countSql = "SELECT " +
            "SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_count, " +
            "SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) AS disputed_count " +
            "FROM employer_validation WHERE role_id = ? AND skill_id = ?";

        double confidence = jdbcTemplate.query(countSql, rs -> {
            if (rs.next()) {
                long confirmed = rs.getLong("confirmed_count");
                long disputed = rs.getLong("disputed_count");
                return calculateConfidence(confirmed, disputed);
            }
            return 0.5;
        }, request.roleId(), request.skillId());

        return new ValidationResponse(
            saved.getId(),
            saved.getRoleId(),
            saved.getSkillId(),
            saved.getStatus(),
            saved.getNote(),
            confidence
        );
    }

    public List<ValidationSummaryItem> getValidationsSummary(Long roleId, Long skillId) {
        if (roleId != null && !roleRepository.existsById(roleId)) {
            throw new ResourceNotFoundException("Role not found: " + roleId);
        }
        if (skillId != null && !skillRepository.existsById(skillId)) {
            throw new ResourceNotFoundException("Skill not found: " + skillId);
        }

        StringBuilder sql = new StringBuilder(
            "SELECT role_id, skill_id, " +
            "SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_count, " +
            "SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END) AS disputed_count " +
            "FROM employer_validation "
        );

        List<Object> params = new ArrayList<>();
        if (roleId != null && skillId != null) {
            sql.append("WHERE role_id = ? AND skill_id = ? ");
            params.add(roleId);
            params.add(skillId);
        } else if (roleId != null) {
            sql.append("WHERE role_id = ? ");
            params.add(roleId);
        } else if (skillId != null) {
            sql.append("WHERE skill_id = ? ");
            params.add(skillId);
        }

        sql.append(
            "GROUP BY role_id, skill_id " +
            "ORDER BY (SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) + " +
            "SUM(CASE WHEN status = 'DISPUTED' THEN 1 ELSE 0 END)) DESC, role_id ASC, skill_id ASC " +
            "LIMIT 100"
        );

        return jdbcTemplate.query(sql.toString(), (rs, rowNum) -> {
            long rId = rs.getLong("role_id");
            long sId = rs.getLong("skill_id");
            long confirmed = rs.getLong("confirmed_count");
            long disputed = rs.getLong("disputed_count");
            double confidence = calculateConfidence(confirmed, disputed);
            return new ValidationSummaryItem(rId, sId, confirmed, disputed, confidence);
        }, params.toArray());
    }
}
