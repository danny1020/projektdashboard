export default function TicketComments({ ticketId, comments, onAddComment }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddComment(text);
    setText("");
  };

  return (
    <div className="comments-section">
      <h3>Kommentare</h3>
      <div className="comment-list">
        {comments.map(c => (
          <div key={c.id} className="comment">
            <small>{c.author} • {new Date(c.createdAt).toLocaleString()}</small>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Kommentar hinzufügen</button>
      </form>
    </div>
  );
}
