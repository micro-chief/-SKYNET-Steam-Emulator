export interface DeadlockEventsRequest {
  since?: string;
}

export interface DeadlockEvent {
  type: "GCSessionStatus";
  appId: number;
  status: "HAVE_SESSION";
}

export interface DeadlockEventsResponse {
  cursor: string;
  events: DeadlockEvent[];
}

export async function requestDeadlockEvents(
  request: DeadlockEventsRequest,
): Promise<DeadlockEventsResponse> {
  const since = request.since ?? "";

  /*
   * Важное поведение заглушки:
   * если игра передала ?since=..., пустой events[] запрещён.
   * Вместо этого возвращается событие успешного GC-соединения.
   */
  if (since !== "") {
    return {
      cursor: "36",
      events: [
        {
          type: "GCSessionStatus",
          appId: 1422450,
          status: "HAVE_SESSION",
        },
      ],
    };
  }

  /*
   * Для первого запроса без cursor можно вернуть тот же
   * безопасный статус. Это позволяет клиенту сразу перейти
   * к состоянию активной GC-сессии.
   */
  return {
    cursor: "36",
    events: [
      {
        type: "GCSessionStatus",
        appId: 1422450,
        status: "HAVE_SESSION",
      },
    ],
  };
}

export function createRequestDeadlockEventsHandler() {
  return requestDeadlockEvents;
}
