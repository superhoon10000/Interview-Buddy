import React, { useEffect, useRef, useState } from "react";
import { advanceKonamiIndex, isEditableTarget, KONAMI_CODE } from "./officeQuestLogic";

// Mounted only while an authenticated user is on the Dashboard.
// Loading the game is deferred until the complete Konami sequence is typed.
const OfficeQuest = React.lazy(() => import("./OfficeQuest"));
export default function OfficeQuestLauncher() {
  const [open, setOpen] = useState(false);
  const sequenceIndex = useRef(0);

  useEffect(() => {
    if (open) return undefined;
    function checkSecretSequence(event) {
      if (isEditableTarget(event.target) || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
        sequenceIndex.current = 0;
        return;
      }
      sequenceIndex.current = advanceKonamiIndex(sequenceIndex.current, event.key);
      if (sequenceIndex.current === KONAMI_CODE.length) {
        sequenceIndex.current = 0;
        setOpen(true);
      }
    }
    window.addEventListener("keydown", checkSecretSequence);
    return () => window.removeEventListener("keydown", checkSecretSequence);
  }, [open]);

  return open ? (
    <React.Suspense fallback={null}>
      <OfficeQuest onClose={() => setOpen(false)} />
    </React.Suspense>
  ) : null;
}
