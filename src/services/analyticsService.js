//Connects Analytics to existing authenticated interview history API.
//Handles pagination as well
import { historyService } from "./historyService";

const PAGE_SIZE = 50;

/**
 * Retrieve all ended sessions belonging to the
 * currently authenticated user.
 */
export const analyticsService = {
  async getCompletedSessions() {
    const sessions = [];
    const visitedCursors = new Set();

    let cursor = null;

    do {
      const page = await historyService.getSessionPage({
        cursor,
        pageSize: PAGE_SIZE,
      });

      sessions.push(...page.sessions);

      cursor = page.nextCursor;

      if (cursor) {
        if (visitedCursors.has(cursor)) {
          throw new Error(
            "The server returned a repeated history cursor."
          );
        }

        visitedCursors.add(cursor);
      }
    } while (cursor);

    return sessions;
  },
};
