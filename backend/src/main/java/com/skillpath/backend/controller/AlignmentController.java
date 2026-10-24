package com.skillpath.backend.controller;

import com.skillpath.backend.dto.SkillGapResponse;
import com.skillpath.backend.service.AlignmentService;
import java.util.List;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alignment")
@CrossOrigin(origins = "*")
public class AlignmentController {

    private final AlignmentService alignmentService;

    public AlignmentController(AlignmentService alignmentService) {
        this.alignmentService = alignmentService;
    }

    @GetMapping("/gaps")
    public List<SkillGapResponse> getAlignmentGaps() {
        return alignmentService.getTopSkillGaps(10);
    }
}
