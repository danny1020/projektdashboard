package de.fom.projektdashboard.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class ApiExceptionHandler {

    // Wandelt Validierungsfehler aus DTOs in eine lesbare JSON-Antwort um.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                FieldError::getDefaultMessage,
                (first, ignored) -> first
            ));

        return ResponseEntity.badRequest().body(Map.of(
            "message", "Die Anfrage enthält ungültige Eingaben.",
            "errors", fieldErrors
        ));
    }

    // Fängt kaputtes JSON oder ungültige Enum-Werte ab.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(Map.of(
            "message", "Die Anfrage konnte nicht gelesen werden. Bitte prüfe JSON und Feldwerte."
        ));
    }

    // Fängt falsche Query- oder Pfadparameter ab, zum Beispiel boardId=abc.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
            "message", "Der Wert für '" + ex.getName() + "' ist ungültig."
        ));
    }
}
