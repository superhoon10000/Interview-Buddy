import Spinner from "../common/Spinner";

export default function SubmittingState({message="Submitting..."}) {
  return (
    <div className="state submitting">
      <Spinner />           
      <p>{message}</p>
    </div>
  );
}