export default function ErrorState({
  message="Something went wrong",
  retry
}) {
  return (
    <div className="state error">
      <p>{message}</p>

      {retry && (
        <button onClick={retry}>
          Try Again
        </button>
      )}
    </div>
  );
}