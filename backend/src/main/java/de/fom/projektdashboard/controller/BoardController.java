package de.fom.projektdashboard.controller;

import de.fom.projektdashboard.model.Invitation;
import de.fom.projektdashboard.model.User;
import de.fom.projektdashboard.model.board.Board;
import de.fom.projektdashboard.model.board.BoardMember;
import de.fom.projektdashboard.model.board.BoardRole;
import de.fom.projektdashboard.model.ticket.Ticket;
import de.fom.projektdashboard.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/boards")
public class BoardController {

    private final BoardRepository boardRepository;
    private final UserRepository userRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final InvitationRepository invitationRepository;
    private final TicketRepository ticketRepository;

    public BoardController(BoardRepository boardRepository, UserRepository userRepository,
                           BoardMemberRepository boardMemberRepository, InvitationRepository invitationRepository, TicketRepository ticketRepository) {
        this.boardRepository = boardRepository;
        this.userRepository = userRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.invitationRepository = invitationRepository;
        this.ticketRepository = ticketRepository;
    }

    // 1. Alle Boards des aktuellen Users holen (Eigene + Boards wo er Mitglied ist)
    @GetMapping
    public ResponseEntity<List<Board>> getMyBoards(Principal principal) {
        List<BoardMember> memberships = boardMemberRepository.findByUserUsername(principal.getName());

        List<Board> myBoards = memberships.stream()
            .map(BoardMember::getBoard)
            .toList();

        return ResponseEntity.ok(myBoards);
    }
    // 2. Neues Board erstellen (Eingeloggter User wird Owner)
    @PostMapping
    public ResponseEntity<?> createBoard(@RequestBody Board board, Principal principal) {
        User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User nicht gefunden"));

        board.setOwner(user);
        Board savedBoard = boardRepository.save(board);

        boardMemberRepository.save(new BoardMember(savedBoard, user, BoardRole.OWNER));

        return ResponseEntity.ok(savedBoard);
    }

    // 3. Board editieren (Nur Owner oder Admin darf das)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateBoard(@PathVariable Long id, @RequestBody Board boardDetails, Principal principal) {
        Board board = boardRepository.findById(id).orElseThrow(() -> new RuntimeException("Board nicht gefunden"));

        // Rechte prüfen
        var memberOpt = boardMemberRepository.findByBoardIdAndUserUsername(id, principal.getName());
        if (memberOpt.isEmpty() || (memberOpt.get().getRole() != BoardRole.OWNER && memberOpt.get().getRole() != BoardRole.ADMIN)) {
            return ResponseEntity.status(403).body("Keine Berechtigung.");
        }

        board.setTitle(boardDetails.getTitle());
        board.setDescription(boardDetails.getDescription());
        board.setJoinPassword(boardDetails.getJoinPassword());

        return ResponseEntity.ok(boardRepository.save(board));
    }

    // 4. Mitglieder eines Boards abrufen
    @GetMapping("/{id}/members")
    public ResponseEntity<List<BoardMember>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(boardMemberRepository.findByBoardId(id));
    }

    // 5. Rolle eines Mitglieds ändern
    @PutMapping("/{id}/members/{memberId}")
    public ResponseEntity<?> changeRole(@PathVariable Long id, @PathVariable Long memberId, @RequestParam BoardRole role, Principal principal) {
        BoardMember operator = boardMemberRepository.findByBoardIdAndUserUsername(id, principal.getName())
            .orElseThrow(() -> new RuntimeException("Nicht im Board"));

        if (operator.getRole() != BoardRole.OWNER && operator.getRole() != BoardRole.ADMIN) {
            return ResponseEntity.status(403).body("Keine Berechtigung");
        }

        BoardMember member = boardMemberRepository.findById(memberId).orElseThrow(() -> new RuntimeException("Mitglied nicht gefunden"));
        member.setRole(role);
        boardMemberRepository.save(member);
        return ResponseEntity.ok("Rolle aktualisiert");
    }

    // 7. Offene Einladungen für die Glocke abrufen
    @GetMapping("/invitations")
    public ResponseEntity<List<Invitation>> getInvitations(Principal principal) {
        return ResponseEntity.ok(invitationRepository.findByInvitedUserUsernameAndAcceptedFalse(principal.getName()));
    }

    // 8. Einladung annehmen
    @PostMapping("/invitations/{inviteId}/accept")
    public ResponseEntity<?> acceptInvitation(@PathVariable Long inviteId) {
        Invitation invitation = invitationRepository.findById(inviteId).orElseThrow(() -> new RuntimeException("Einladung nicht gefunden"));
        invitation.setAccepted(true);
        invitationRepository.save(invitation);

        boardMemberRepository.save(new BoardMember(invitation.getBoard(), invitation.getInvitedUser(), BoardRole.MITARBEITER));
        return ResponseEntity.ok("Einladung angenommen!");
    }

    // 1. Board per Passwort beitreten
    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinBoard(@PathVariable Long id, @RequestParam String password, Principal principal) {
        Board board = boardRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Board nicht gefunden"));

        if (board.getJoinPassword() == null || board.getJoinPassword().isEmpty()) {
            return ResponseEntity.badRequest().body("Dieses Board benötigt kein Passwort oder ist privat.");
        }

        if (!board.getJoinPassword().equals(password)) {
            return ResponseEntity.status(401).body("Falsches Board-Passwort!");
        }

        var existingMember = boardMemberRepository.findByBoardIdAndUserUsername(id, principal.getName());
        if (existingMember.isPresent()) {
            return ResponseEntity.badRequest().body("Du bist bereits Mitglied dieses Boards.");
        }

        User user = userRepository.findByUsername(principal.getName())
            .orElseThrow(() -> new RuntimeException("User nicht gefunden"));

        boardMemberRepository.save(new BoardMember(board, user, BoardRole.MITARBEITER));

        return ResponseEntity.ok("Erfolgreich über Passwort beigetreten!");
    }

    // 2. Erweitere die inviteUser-Methode um die Existenzprüfung
    @PostMapping("/{id}/invite")
    public ResponseEntity<?> inviteUser(@PathVariable Long id, @RequestParam String username, Principal principal) {
        Board board = boardRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Board nicht gefunden"));

        if (principal.getName().equalsIgnoreCase(username)) {
            return ResponseEntity.badRequest().body("Du kannst dich nicht selbst einladen!");
        }

        Optional<User> targetUserOpt = userRepository.findByUsername(username);
        if (targetUserOpt.isEmpty()) {
            return ResponseEntity.status(404).body("Der User '" + username + "' existiert nicht im System.");
        }
        User targetUser = targetUserOpt.get();

        var existingMember = boardMemberRepository.findByBoardIdAndUserUsername(id, username);
        if (existingMember.isPresent()) {
            return ResponseEntity.badRequest().body("Dieser User ist bereits Mitglied.");
        }

        boolean alreadyInvited = invitationRepository.findByInvitedUserUsernameAndAcceptedFalse(username)
            .stream()
            .anyMatch(inv -> inv.getBoard().getId().equals(id));
        if (alreadyInvited) {
            return ResponseEntity.badRequest().body("Dieser User wurde bereits eingeladen.");
        }

        Invitation invitation = new Invitation();
        invitation.setBoard(board);
        invitation.setInvitedUser(targetUser);
        invitationRepository.save(invitation);

        return ResponseEntity.ok("Einladung verschickt!");
    }

    @GetMapping("/stats/{boardId}")
    public ResponseEntity<?> getBoardStats(@PathVariable Long boardId, Principal principal) {
        if (boardMemberRepository.findByBoardIdAndUserUsername(boardId, principal.getName()).isEmpty()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Zugriff verweigert"));
        }

        List<Ticket> tickets = ticketRepository.findByBoardIdOrderByStatusAscOrderIndexAscCreatedAtAsc(boardId);

        Map<String, Long> statusCounts = tickets.stream()
            .collect(Collectors.groupingBy(
                t -> t.getStatus() == null ? "TODO" : t.getStatus(),
                Collectors.counting()
            ));

        Map<String, Object> response = new HashMap<>();
        response.put("totalTickets", (long) tickets.size());
        response.put("statusCounts", statusCounts);

        return ResponseEntity.ok(response);
    }
}
