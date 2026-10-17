export function acceptSaved(live, snapshot, result, copy = false) {
  return {
    ...live,
    id: result.id,
    revision: result.revision,
    ...(copy ? { title: snapshot.title + " (cópia)" } : {}),
  };
}
export function mayLeaveDocument(currentEpoch, savedEpoch) {
  return currentEpoch === savedEpoch;
}
