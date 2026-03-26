export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export function mapDomainError(error: unknown) {
  const message = (error as Error).message;
  const mapping: Record<string, { status: number; code: string }> = {
    USER_NOT_FOUND: { status: 404, code: "USER_NOT_FOUND" },
    MATCH_NOT_FOUND: { status: 404, code: "MATCH_NOT_FOUND" },
    PLAYER_NOT_FOUND: { status: 404, code: "PLAYER_NOT_FOUND" },
    MATCH_NOT_ACTIVE: { status: 409, code: "MATCH_NOT_ACTIVE" },
    NOT_ENOUGH_LIFE_POINTS: { status: 400, code: "NOT_ENOUGH_LIFE_POINTS" }
  };

  return mapping[message] ?? { status: 400, code: "BAD_REQUEST" };
}
