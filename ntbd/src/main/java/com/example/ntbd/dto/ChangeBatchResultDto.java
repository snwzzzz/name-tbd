package com.example.ntbd.dto;

import java.util.Map;

/** The id each thing created in the batch got, by the ref the editor gave it. */
public record ChangeBatchResultDto(
        Map<String, Long> ids
) {
}
