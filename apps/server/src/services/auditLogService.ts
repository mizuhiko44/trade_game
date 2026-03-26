export function auditLog(event: string, payload: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      type: "AUDIT",
      event,
      payload,
      at: new Date().toISOString()
    })
  );
}
