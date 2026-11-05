/** While Fantasy Core answers: a quiet spinner in fantasy's colours. */
export default function Loading() {
  return (
    <div className="fx-loading" aria-busy="true" aria-label="Loading">
      <span className="fx-spinner" />
    </div>
  );
}
