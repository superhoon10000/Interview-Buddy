export default function LoadingState({message="Loading..."}) {
  return (
    <div className="state loading">
      <Spinner />           // Needs definition for Spinner component
      <p>{message}</p>
    </div>
  );
}