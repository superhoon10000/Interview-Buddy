export default function SubmittingState({message="Submitting..."}) {
  return (
    <div className="state submitting">
      <Spinner />           // Needs definition for Spinner component
      <p>{message}</p>
    </div>
  );
}