package com.skillpath.backend.controller;

import com.skillpath.backend.dto.RoleItem;
import com.skillpath.backend.repository.RoleRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public List<RoleItem> getRoles() {
        return roleRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
            .map(r -> new RoleItem(r.getId(), r.getName(), r.getSector()))
            .toList();
    }
}

