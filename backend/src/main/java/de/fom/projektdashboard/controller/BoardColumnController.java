package de.fom.projektdashboard.controller;

import de.fom.projektdashboard.model.board.BoardColumn;
import de.fom.projektdashboard.repository.BoardColumnRepository;
import de.fom.projektdashboard.repository.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/boards/{boardId}/columns")
@CrossOrigin(origins = "*")
public class BoardColumnController {

    @Autowired
    private BoardColumnRepository boardColumnRepository;

    @Autowired
    private TicketRepository ticketRepository;

    // Lädt die Spalten eines Boards in ihrer gespeicherten Reihenfolge.
    @GetMapping
    public ResponseEntity<List<BoardColumn>> getColumns(@PathVariable Long boardId) {
        return ResponseEntity.ok(boardColumnRepository.findByBoardIdOrderByPositionAsc(boardId));
    }

    // Erstellt eine neue Statusspalte für ein Board.
    @PostMapping
    public ResponseEntity<?> createColumn(@PathVariable Long boardId, @RequestBody Map<String, String> payload) {
        String columnKey = payload.get("value");
        String label = payload.get("label");

        if (columnKey == null || label == null || label.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Value und Label sind erforderlich."));
        }

        String formattedKey = columnKey.toUpperCase().trim();

        if (boardColumnRepository.findByBoardIdAndColumnKey(boardId, formattedKey).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Diese Spalte existiert bereits auf diesem Board."));
        }

        List<BoardColumn> existingCols = boardColumnRepository.findByBoardIdOrderByPositionAsc(boardId);
        int nextPosition = existingCols.size() + 1;

        BoardColumn newColumn = new BoardColumn();
        newColumn.setBoardId(boardId);
        newColumn.setColumnKey(formattedKey);
        newColumn.setLabel(label.trim());
        newColumn.setPosition(nextPosition);

        return ResponseEntity.status(HttpStatus.CREATED).body(boardColumnRepository.save(newColumn));
    }

    // Aktualisiert den sichtbaren Namen einer bestehenden Spalte.
    @PutMapping("/{statusValue}")
    public ResponseEntity<?> renameColumn(
        @PathVariable Long boardId,
        @PathVariable String statusValue,
        @RequestBody Map<String, String> payload) {

        String newLabel = payload.get("label");
        if (newLabel == null || newLabel.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ein gültiger Spaltenname wird benötigt."));
        }

        return boardColumnRepository.findByBoardIdAndColumnKey(boardId, statusValue.toUpperCase())
            .map(column -> {
                column.setLabel(newLabel.trim());
                boardColumnRepository.save(column);
                return ResponseEntity.ok(Map.of("message", "Spaltenname aktualisiert.", "column", column));
            })
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Spalte nicht gefunden.")));
    }

    // Löscht eine Spalte und verschiebt betroffene Tickets zurück nach TODO.
    @DeleteMapping("/{statusValue}")
    public ResponseEntity<?> deleteColumn(@PathVariable Long boardId, @PathVariable String statusValue) {

        if ("TODO".equalsIgnoreCase(statusValue)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Die Standard-Spalte 'TODO' darf nicht gelöscht werden."));
        }

        return boardColumnRepository.findByBoardIdAndColumnKey(boardId, statusValue.toUpperCase())
            .map(column -> {
                ticketRepository.updateStatusForBoard(boardId, statusValue.toUpperCase(), "TODO");

                boardColumnRepository.delete(column);

                return ResponseEntity.ok(Map.of("message", "Spalte gelöscht. Tickets wurden nach 'TODO' verschoben."));
            })
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Spalte nicht gefunden.")));
    }
}
