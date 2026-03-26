export type DebugMessage = {
  id: string;
  text: string;
  source: string;
  createdAt: string;
};

const messages: DebugMessage[] = [];

export function addDebugMessage(text: string, source = "external") {
  const msg: DebugMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text,
    source,
    createdAt: new Date().toISOString()
  };
  messages.unshift(msg);
  if (messages.length > 100) messages.pop();
  return msg;
}

export function listDebugMessages(limit = 20) {
  return messages.slice(0, limit);
}

export function clearDebugMessages() {
  messages.length = 0;
  return { cleared: true };
}
