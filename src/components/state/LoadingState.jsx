import Spinner from "../common/Spinner";

export default function LoadingState({message="Loading..."}) {
  return (
    <div className="state loading">
      <Spinner />           
      <p>{message}</p>
    </div>
  );
}