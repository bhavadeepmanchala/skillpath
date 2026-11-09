package com.skillpath.backend.repository;

import com.skillpath.backend.domain.EmployerValidation;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployerValidationRepository extends JpaRepository<EmployerValidation, Long> {
    List<EmployerValidation> findByRoleId(Long roleId);
    List<EmployerValidation> findBySkillId(Long skillId);
}
