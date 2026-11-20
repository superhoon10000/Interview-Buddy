import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LeaderboardPage from "./LeaderboardPage";
import { useAuth } from "../context/AuthContext";
import { leaderboardService } from "../services/leaderboardService";

jest.mock("../components/layout/PageLayout", () => ({ title, children }) => (
  <main><h1>{title}</h1>{children}</main>
));
jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../services/leaderboardService", () => ({
  leaderboardService: {
    getGlobalLeaderboard: jest.fn(),
    getFriendRequests: jest.fn(),
    getFriendsLeaderboard: jest.fn(),
    getUserRanking: jest.fn(),
    getAcceptedFriends: jest.fn(),
    searchFriends: jest.fn(),
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    declineFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
  },
}));

const unavailable = () => Object.assign(new Error("Ranking and friends data is not available yet."), { code: "feature-unavailable" });

beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { uid: "test-user" } });
  leaderboardService.getGlobalLeaderboard.mockRejectedValue(unavailable());
  leaderboardService.getFriendRequests.mockResolvedValue({
    incoming: [],
    outgoing: [],
  });
  leaderboardService.getFriendsLeaderboard.mockRejectedValue(unavailable());
  leaderboardService.getUserRanking.mockRejectedValue(unavailable());
  leaderboardService.getAcceptedFriends.mockResolvedValue([]);
  leaderboardService.searchFriends.mockResolvedValue([]);
});

test("unimplemented backend shows unavailable states rather than mock rankings", async () => {
  leaderboardService.getAcceptedFriends.mockRejectedValue(unavailable());
  render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
  expect(await screen.findByText("Ranking data is not available yet")).toBeInTheDocument();
  expect(screen.getByText("Your ranking is not available yet.")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Rank badge unavailable" })).toBeInTheDocument();
  expect(screen.queryByAltText(/ELO rank badge/)).not.toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(screen.getByText("Friends data is not available yet.")).toBeInTheDocument();
  expect(screen.getByText("No sample rankings are displayed.", { exact: false })).toBeInTheDocument();

  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
  expect(screen.getByRole("tab", { name: "Friends" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("button", { name: "Add Friend" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Username" })).toBeDisabled();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(leaderboardService.sendFriendRequest).not.toHaveBeenCalled();
});

test("successful empty backend responses show No available data and zero friends", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
  expect(await screen.findByText("No available data", { selector: "h2" })).toBeInTheDocument();
  expect(screen.getByText("You do not have a ranking yet.")).toBeInTheDocument();
  expect(screen.getByText("No friends available yet.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
  expect(screen.getByRole("button", { name: "Add Friend" })).toBeDisabled(); // Requires a username.
  expect(screen.getByRole("textbox", { name: "Username" })).toBeEnabled();
  expect(screen.getByText("No friends yet")).toBeInTheDocument();
  expect(screen.getByText("Add a friend to compare ELO rankings here.")).toBeInTheDocument();
});

test("renders current ELO, global standing and user's saved rank badge", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([
    { uid: "someone", username: "Sam", elo: 1400, rank: 1 },
    { uid: "test-user", username: "Me", elo: 1160, rank: 2 },
  ]);
  leaderboardService.getFriendsLeaderboard.mockRejectedValue(unavailable());
  leaderboardService.getUserRanking.mockResolvedValue({
    uid: "test-user", username: "Me", rank: 2, elo: 1160,
  });

  render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
  const table = await screen.findByRole("table");

  //Row badges
  expect(
    within(table).getByRole("img", {
      name: "NVIDIA ELO badge for Sam",
    })
  ).toBeInTheDocument();

  expect(
    within(table).getByRole("img", {
      name: "Bill Gates ELO badge for Me",
    })
  ).toBeInTheDocument();

  expect(within(table).getByRole("columnheader", { name: "ELO Score" })).toBeInTheDocument();
  expect(within(table).getByText("Sam")).toBeInTheDocument();
  expect(within(table).getByText("Me")).toBeInTheDocument();
  expect(within(table).getByText("You")).toBeInTheDocument();
  expect(within(table).getByText("1,400")).toBeInTheDocument();
  expect(screen.getByText("#2")).toBeInTheDocument();
  expect(screen.getByText("Current ELO")).toBeInTheDocument();
  expect(screen.getAllByText("1,160").length).toBeGreaterThan(0);
  expect(screen.queryByText("Total Points")).not.toBeInTheDocument();
  expect(screen.getByAltText("Bill Gates ELO rank badge")).toHaveAttribute(
    "src", "/Minisofty%20Capybara%20Innovation%20Badge.png"
  );
  expect(screen.getByText("No friends available yet.")).toBeInTheDocument();
});

//Verifies that Global and Friends are two views of the same page and that swithcing displays correct data
test("switches between global and friends rankings in one leaderboard view", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([
    { uid: "global-1", username: "GlobalLeader", rank: 1, elo: 1600 },
  ]);

  leaderboardService.getFriendsLeaderboard.mockResolvedValue([
    { uid: "friend-1", username: "FriendLeader", rank: 1, elo: 1400 },
  ]);

  leaderboardService.getAcceptedFriends.mockResolvedValue([
    { uid: "friend-1", username: "FriendLeader" },
  ]);

  leaderboardService.getUserRanking.mockResolvedValue(null);

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  // Verify global rankings display first.
  const globalPanel = screen.getByRole("tabpanel", {
    name: "Global",
  });

  expect(
    await within(globalPanel).findByText("GlobalLeader")
  ).toBeInTheDocument();

  expect(
    within(globalPanel).queryByText("FriendLeader")
  ).not.toBeInTheDocument();

  // Switch to Friends.
  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));

  const friendsPanel = screen.getByRole("tabpanel", {
    name: "Friends",
  });

  const rankings = within(friendsPanel).getByRole("region", {
    name: "Friends leaderboard",
  });

  expect(
    await within(rankings).findByText("FriendLeader")
  ).toBeInTheDocument();

  expect(
    within(rankings).queryByText("GlobalLeader")
  ).not.toBeInTheDocument();

  // Friends Rankings must appear first.
  expect(
    within(friendsPanel).getAllByRole("region")[0]
  ).toBe(rankings);

  // Return to Global.
  fireEvent.click(screen.getByRole("tab", { name: "Global" }));

  expect(
    within(
      screen.getByRole("tabpanel", { name: "Global" })
    ).getByText("GlobalLeader")
  ).toBeInTheDocument();

  expect(
    screen.queryByRole("region", { name: "Friends leaderboard" })
  ).not.toBeInTheDocument();
});

//Accepted friend should still exist in friend list even without ELO
test("friends view explains when no accepted friends have rankings yet", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);

  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);

  leaderboardService.getAcceptedFriends.mockResolvedValue([
    { uid: "unranked-1", username: "UnrankedFriend" },
  ]);

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));

  const rankings = screen.getByRole("region", {
    name: "Friends leaderboard",
  });

  expect(
    await within(rankings).findByText("No ranked friends yet")
  ).toBeInTheDocument();

  expect(
    within(rankings).getByText(
      "Your accepted friends will appear here once they have a ranked interview."
    )
  ).toBeInTheDocument();

  expect(
    screen.getByRole("region", { name: "Accepted Friends" })
  ).toHaveTextContent("UnrankedFriend");
});

test("friends tab retains ELO labels for the future friends service", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([
    { uid: "friend-1", username: "Taylor", elo: 1400, rank: 5 },
  ]);
  leaderboardService.getUserRanking.mockResolvedValue(null);
  leaderboardService.getAcceptedFriends.mockResolvedValue([
    { uid: "friend-1", username: "Taylor" },
  ]);
  render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
  const table = await screen.findByRole("table");
  expect(within(table).getByRole("columnheader", { name: "ELO Score" })).toBeInTheDocument();
  expect(within(table).getByText("1,400")).toBeInTheDocument();
  expect(within(table).getByText("Taylor")).toBeInTheDocument();
  expect(screen.getByText("Rank #5")).toBeInTheDocument();
});

//Preserve OG test purpose while checking new removal location
test("friend request and removal call APIs, not local fake changes", async () => {
  const friend = {
    uid: "friend-1",
    username: "Taylor",
    elo: 1400,
    rank: 5,
  };

  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);

  leaderboardService.getFriendsLeaderboard
    .mockResolvedValueOnce([friend])
    .mockResolvedValueOnce([friend])
    .mockResolvedValueOnce([]);

  leaderboardService.getAcceptedFriends
    .mockResolvedValueOnce([
      { uid: "friend-1", username: "Taylor" },
    ])
    .mockResolvedValueOnce([]);

  leaderboardService.getUserRanking.mockResolvedValue(null);
  leaderboardService.sendFriendRequest.mockResolvedValue({
    status: "pending",
  });
  leaderboardService.removeFriend.mockResolvedValue({});

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const accepted = screen.getByRole("region", {
    name: "Accepted Friends",
  });

  // Remove must exist in Accepted Friends.
  expect(
    await within(accepted).findByRole("button", {
      name: "Remove Taylor from accepted friends",
    })
  ).toBeInTheDocument();

  // Sending a friend request should not immediately add them.
  fireEvent.change(
    screen.getByRole("textbox", { name: "Username" }),
    { target: { value: "Morgan" } }
  );

  fireEvent.click(
    screen.getByRole("button", { name: "Add Friend" })
  );

  await waitFor(() => {
    expect(
      leaderboardService.sendFriendRequest
    ).toHaveBeenCalledWith("Morgan");
  });

  expect(
    await screen.findByText(/Friend request sent to "Morgan"/)
  ).toBeInTheDocument();

  expect(
    screen.queryByText("Morgan", {
      selector: ".ibRankingUsername",
    })
  ).not.toBeInTheDocument();

  // Removal happens only through Accepted Friends.
  const removeButton = within(accepted).getByRole("button", {
    name: "Remove Taylor from accepted friends",
  });

  await waitFor(() => {
    expect(removeButton).toBeEnabled();
  });

  fireEvent.click(removeButton);

  await waitFor(() => {
    expect(
      leaderboardService.removeFriend
    ).toHaveBeenCalledWith("friend-1");
  });

  expect(
    await within(accepted).findByText("No accepted friends")
  ).toBeInTheDocument();

  expect(
    await screen.findByText("No friends yet")
  ).toBeInTheDocument();
});

//Test both requests together.
test("shows self in Friends Rankings with Remove only in Accepted Friends", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);

  leaderboardService.getFriendsLeaderboard.mockResolvedValue([
    {
      uid: "friend-1",
      username: "Taylor",
      rank: 1,
      elo: 1400,
    },
    {
      uid: "test-user",
      username: "Me",
      rank: 2,
      elo: 1200,
    },
  ]);

  leaderboardService.getAcceptedFriends.mockResolvedValue([
    { uid: "friend-1", username: "Taylor" },
  ]);

  leaderboardService.getUserRanking.mockResolvedValue({
    uid: "test-user",
    username: "Me",
    rank: 2,
    elo: 1200,
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const rankings = screen.getByRole("region", {
    name: "Friends leaderboard",
  });

  const table = await within(rankings).findByRole("table");

  // Both the friend and the current user are ranked.
  expect(
    within(table).getByText("Taylor")
  ).toBeInTheDocument();

  expect(
    within(table).getByText("Me")
  ).toBeInTheDocument();

  // The signed-in user's row is identified.
  expect(
    within(table).getByText("You")
  ).toBeInTheDocument();

  // Self is not counted as an accepted friend.
  expect(
    within(rankings).getByText("1 ranked friend + you")
  ).toBeInTheDocument();

  // Ranking table no longer provides removal actions.
  expect(
    within(table).queryByRole("columnheader", {
      name: "Action",
    })
  ).not.toBeInTheDocument();

  expect(
    within(rankings).queryByRole("button", {
      name: /Remove Taylor/i,
    })
  ).not.toBeInTheDocument();

  // Accepted Friends still provides removal.
  const accepted = screen.getByRole("region", {
    name: "Accepted Friends",
  });

  expect(
    within(accepted).getByRole("button", {
      name: "Remove Taylor from accepted friends",
    })
  ).toBeInTheDocument();
});

test("failed requests do not claim a friend was added", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);
  leaderboardService.sendFriendRequest.mockRejectedValue(unavailable());

  render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
  fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
  const input = await screen.findByRole("textbox", { name: "Username" });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "Alex" } });
  fireEvent.click(screen.getByRole("button", { name: "Add Friend" }));
  expect(await screen.findByText("Ranking and friends data is not available yet.")).toBeInTheDocument();
  expect(screen.queryByText(/Friend request sent/)).not.toBeInTheDocument();
});

//Test verifies taht the frontend correctly separates incoming and outgoing requests
test("displays real incoming and outgoing pending friend requests", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getFriendRequests.mockResolvedValue({
    incoming: [
      {
        id: "request-1",
        requesterUid: "alice",
        recipientUid: "test-user",
        status: "pending",
        user: {
          uid: "alice",
          username: "Alice",
        },
      },
    ],
    outgoing: [
      {
        id: "request-2",
        requesterUid: "test-user",
        recipientUid: "bob",
        status: "pending",
        user: {
          uid: "bob",
          username: "Bob",
        },
      },
    ],
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const incoming = await screen.findByRole("region", {
    name: "Incoming Friend Requests",
  });

  const outgoing = screen.getByRole("region", {
    name: "Sent Friend Requests",
  });

  expect(
    await within(incoming).findByText("Alice")
  ).toBeInTheDocument();

  expect(
    within(outgoing).getByText("Bob")
  ).toBeInTheDocument();

  expect(
    within(incoming).getByText("Pending")
  ).toBeInTheDocument();

  expect(
    within(outgoing).getByText("Pending")
  ).toBeInTheDocument();
});

//Confirms that sending a request updates the pending request display without relying on fake frontend state
test("successful friend request refreshes sent requests from the server", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getFriendRequests
    .mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
    })
    .mockResolvedValueOnce({
      incoming: [],
      outgoing: [
        {
          id: "request-3",
          requesterUid: "test-user",
          recipientUid: "morgan",
          status: "pending",
          user: {
            uid: "morgan",
            username: "Morgan",
          },
        },
      ],
    });

  leaderboardService.sendFriendRequest.mockResolvedValue({
    request: { status: "pending" },
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const input = await screen.findByRole("textbox", {
    name: "Username",
  });

  await waitFor(() => expect(input).toBeEnabled());

  fireEvent.change(input, {
    target: { value: "Morgan" },
  });

  fireEvent.click(
    screen.getByRole("button", { name: "Add Friend" })
  );

  const outgoing = screen.getByRole("region", {
    name: "Sent Friend Requests",
  });

  expect(
    await within(outgoing).findByText("Morgan")
  ).toBeInTheDocument();

  expect(
    leaderboardService.getFriendRequests
  ).toHaveBeenCalledTimes(2);
});

//Accepting a friend request
test("accepting a request updates the pending list and friends rankings", async () => {
  const requestRecord = {
    id: "request-1",
    requesterUid: "alice",
    recipientUid: "test-user",
    status: "pending",
    user: { uid: "alice", username: "Alice" },
  };

  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getFriendsLeaderboard
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { uid: "alice", username: "Alice", rank: 1, elo: 1200 },
    ]);

  leaderboardService.getFriendRequests
    .mockResolvedValueOnce({
      incoming: [requestRecord],
      outgoing: [],
    })
    .mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
    });

  leaderboardService.acceptFriendRequest.mockResolvedValue({
    request: { status: "accepted" },
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const incoming = await screen.findByRole("region", {
    name: "Incoming Friend Requests",
  });

  expect(
    await within(incoming).findByText("Alice")
  ).toBeInTheDocument();

  fireEvent.click(
    within(incoming).getByRole("button", {
      name: "Accept friend request from Alice",
    })
  );

  await waitFor(() => {
    expect(
      leaderboardService.acceptFriendRequest
    ).toHaveBeenCalledWith("alice");
  });

  await waitFor(() => {
    expect(
      within(incoming).queryByText("Alice")
    ).not.toBeInTheDocument();
  });

  expect(
    await screen.findByText("Alice", {
      selector: ".ibRankingUsername",
    })
  ).toBeInTheDocument();
});

//Declining a friend request
test("declining a request removes it from pending requests", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getFriendRequests
    .mockResolvedValueOnce({
      incoming: [
        {
          id: "request-2",
          requesterUid: "bob",
          recipientUid: "test-user",
          status: "pending",
          user: { uid: "bob", username: "Bob" },
        },
      ],
      outgoing: [],
    })
    .mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
    });

  leaderboardService.declineFriendRequest.mockResolvedValue({
    request: { status: "declined" },
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const incoming = await screen.findByRole("region", {
    name: "Incoming Friend Requests",
  });

  expect(
    await within(incoming).findByText("Bob")
  ).toBeInTheDocument();

  fireEvent.click(
    within(incoming).getByRole("button", {
      name: "Decline friend request from Bob",
    })
  );

  await waitFor(() => {
    expect(
      leaderboardService.declineFriendRequest
    ).toHaveBeenCalledWith("bob");
  });

  await waitFor(() => {
    expect(
      within(incoming).queryByText("Bob")
    ).not.toBeInTheDocument();
  });

  expect(
    leaderboardService.getFriendsLeaderboard
  ).toHaveBeenCalledTimes(2);
});

//Confirms that an accepted friend remains visible independently of rankings
test("displays accepted friends even without ranking data", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getAcceptedFriends.mockResolvedValue([
    { uid: "friend-1", username: "Taylor" },
  ]);

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const accepted = await screen.findByRole("region", {
    name: "Accepted Friends",
  });

  expect(
    await within(accepted).findByText("Taylor")
  ).toBeInTheDocument();

  expect(
    within(accepted).getByRole("button", {
      name: "Remove Taylor from accepted friends",
    })
  ).toBeInTheDocument();

  expect(
    screen.getByText("1 friend in your list")
  ).toBeInTheDocument();

  const rankings = screen.getByRole("region", {
    name: "Friends leaderboard",
  });

  expect(
    within(rankings).getByText("0 ranked friends")
  ).toBeInTheDocument();

  expect(
    within(rankings).getByText("No ranked friends yet")
  ).toBeInTheDocument();
});

//Confirm that removing will refresh and remove visibility as well
test("removing an accepted friend refreshes the friends list", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getAcceptedFriends
    .mockResolvedValueOnce([
      { uid: "friend-1", username: "Taylor" },
    ])
    .mockResolvedValueOnce([]);

  leaderboardService.removeFriend.mockResolvedValue({
    removed: true,
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const accepted = await screen.findByRole("region", {
    name: "Accepted Friends",
  });

  const removeButton = await within(accepted).findByRole(
    "button",
    { name: "Remove Taylor from accepted friends" }
  );

  fireEvent.click(removeButton);

  await waitFor(() => {
    expect(
      leaderboardService.removeFriend
    ).toHaveBeenCalledWith("friend-1");
  });

  await waitFor(() => {
    expect(
      leaderboardService.getAcceptedFriends
    ).toHaveBeenCalledTimes(2);
  });

  expect(
    await within(accepted).findByText("No accepted friends")
  ).toBeInTheDocument();

  expect(
    within(accepted).queryByText("Taylor")
  ).not.toBeInTheDocument();
});

//Confirm that accepting a request refreshes the list
test("accepting a request refreshes the accepted friends list", async () => {
  const incomingRequest = {
    id: "request-alice",
    requesterUid: "alice",
    recipientUid: "test-user",
    status: "pending",
    user: { uid: "alice", username: "Alice" },
  };

  leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  leaderboardService.getFriendRequests
    .mockResolvedValueOnce({
      incoming: [incomingRequest],
      outgoing: [],
    })
    .mockResolvedValueOnce({
      incoming: [],
      outgoing: [],
    });

  leaderboardService.getAcceptedFriends
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      { uid: "alice", username: "Alice" },
    ]);

  leaderboardService.acceptFriendRequest.mockResolvedValue({
    request: { status: "accepted" },
  });

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  fireEvent.click(
    screen.getByRole("tab", { name: "Friends" })
  );

  const incoming = await screen.findByRole("region", {
    name: "Incoming Friend Requests",
  });

  const acceptButton = await within(incoming).findByRole(
    "button",
    { name: "Accept friend request from Alice" }
  );

  fireEvent.click(acceptButton);

  const accepted = screen.getByRole("region", {
    name: "Accepted Friends",
  });

  expect(
    await within(accepted).findByText("Alice")
  ).toBeInTheDocument();

  expect(
    leaderboardService.getAcceptedFriends
  ).toHaveBeenCalledTimes(2);
});

//ELO trend rendering tests
test("displays positive, negative, and flat ELO trends", async () => {
  leaderboardService.getGlobalLeaderboard.mockResolvedValue([
    {
      uid: "up",
      username: "Alex",
      rank: 1,
      elo: 1400,
      lastEloChange: 16,
    },
    {
      uid: "down",
      username: "Jordan",
      rank: 2,
      elo: 1300,
      lastEloChange: -8,
    },
    {
      uid: "flat",
      username: "Taylor",
      rank: 3,
      elo: 1200,
      lastEloChange: 0,
    },
  ]);

  leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
  leaderboardService.getUserRanking.mockResolvedValue(null);

  render(
    <LeaderboardPage
      currentPage="/leaderboard"
      onNavigate={() => {}}
    />
  );

  const table = await screen.findByRole("table");

  expect(
    within(table).getByRole("img", {
      name: "ELO increased by 16",
    })
  ).toHaveTextContent("↑+16");

  expect(
    within(table).getByRole("img", {
      name: "ELO decreased by 8",
    })
  ).toHaveTextContent("↓-8");

  expect(
    within(table).getByRole("img", {
      name: "ELO unchanged",
    })
  ).toHaveTextContent("→0");
});

describe("SCRUM-108 friend discovery", () => {
  test("searches matching public usernames without creating a friend request", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
    leaderboardService.getUserRanking.mockResolvedValue(null);
    leaderboardService.searchFriends.mockResolvedValueOnce([
      { uid: "one", username: "Alex", relationship: "none" },
      { uid: "two", username: "Alexa", relationship: "outgoing" },
      { uid: "three", username: "Alexis", relationship: "friends" },
      { uid: "four", username: "Alexander", relationship: "incoming" },
    ]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
    const input = await screen.findByRole("textbox", { name: "Username" });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Ale" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    const results = await screen.findByRole("region", { name: "User search results" });
    expect(await within(results).findByText("Alex")).toBeInTheDocument();
    expect(within(results).getByText("Alexa")).toBeInTheDocument();
    expect(within(results).getByText("Already friends")).toBeInTheDocument();
    expect(within(results).getByText("Request sent")).toBeInTheDocument();
    expect(within(results).getByText("Respond in incoming requests")).toBeInTheDocument();
    expect(within(results).getByRole("button", { name: "Send friend request to Alex" })).toBeInTheDocument();
    expect(leaderboardService.searchFriends).toHaveBeenCalledWith("Ale");
    expect(leaderboardService.sendFriendRequest).not.toHaveBeenCalled();
  });

  test("sending from a search result marks the row pending and reloads requests", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
    leaderboardService.getUserRanking.mockResolvedValue(null);
    leaderboardService.searchFriends.mockResolvedValueOnce([
      { uid: "morgan", username: "Morgan", relationship: "none" },
    ]);
    leaderboardService.sendFriendRequest.mockResolvedValueOnce({ request: { status: "pending" } });

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
    const input = await screen.findByRole("textbox", { name: "Username" });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Mor" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const results = await screen.findByRole("region", { name: "User search results" });
    fireEvent.click(await within(results).findByRole("button", { name: "Send friend request to Morgan" }));
    await waitFor(() => expect(leaderboardService.sendFriendRequest).toHaveBeenCalledWith("Morgan"));
    expect(await within(results).findByText("Request sent")).toBeInTheDocument();
    expect(leaderboardService.getFriendRequests).toHaveBeenCalledTimes(2);
  });

  test("search validation and service failures show errors without false success", async () => {
    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
    const input = await screen.findByRole("textbox", { name: "Username" });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter 2 to 64 characters");
    expect(leaderboardService.searchFriends).not.toHaveBeenCalled();

    leaderboardService.searchFriends.mockRejectedValueOnce(new Error("Search unavailable"));
    fireEvent.change(input, { target: { value: "alex" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(await screen.findByText("Search unavailable")).toHaveAttribute("role", "alert");
    expect(leaderboardService.sendFriendRequest).not.toHaveBeenCalled();
  });
});

describe("SCRUM-110 friends-only ranking refresh workflow", () => {
  const ranking = (uid, username, rank, elo) => ({ uid, username, rank, elo });
  const viewFriends = () => fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
  const viewGlobal = () => fireEvent.click(screen.getByRole("tab", { name: "Global" }));

  test("refreshes server ELO and membership when returning to Friends", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard
      .mockResolvedValueOnce([ranking("old", "OldFriend", 1, 1200)])
      .mockResolvedValueOnce([ranking("new", "NewLeader", 1, 1450)]);
    leaderboardService.getAcceptedFriends
      .mockResolvedValueOnce([{ uid: "old", username: "OldFriend" }])
      .mockResolvedValueOnce([{ uid: "new", username: "NewLeader" }]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    expect(await screen.findByText("1,200 ELO")).toBeInTheDocument();
    viewFriends();
    expect(leaderboardService.getFriendsLeaderboard).toHaveBeenCalledTimes(1);
    viewGlobal();
    viewFriends();

    const friendsPanel = screen.getByRole("region", { name: "Friends leaderboard" });
    expect(await within(friendsPanel).findByText("NewLeader")).toBeInTheDocument();
    expect(within(friendsPanel).getByText("1,450")).toBeInTheDocument();
    expect(within(friendsPanel).queryByText("OldFriend")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Accepted Friends" })).toHaveTextContent("NewLeader");
    expect(leaderboardService.getFriendsLeaderboard).toHaveBeenCalledTimes(2);
    expect(leaderboardService.getAcceptedFriends).toHaveBeenCalledTimes(2);
  });

  test("displays a friends-specific loading state and avoids duplicate refreshes", async () => {
    let resolveFresh;
    const inFlight = new Promise((resolve) => { resolveFresh = resolve; });
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard
      .mockResolvedValueOnce([ranking("old", "OldFriend", 1, 1200)])
      .mockReturnValueOnce(inFlight);
    leaderboardService.getAcceptedFriends.mockResolvedValue([{ uid: "old", username: "OldFriend" }]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    expect(await screen.findByText("1,200 ELO")).toBeInTheDocument();
    viewFriends();
    viewGlobal();
    viewFriends();

    const friendsPanel = screen.getByRole("region", { name: "Friends leaderboard" });
    expect(
      within(friendsPanel).getByText("Updating friends rankings...")
    ).toBeInTheDocument();
    expect(within(friendsPanel).queryByText("OldFriend")).not.toBeInTheDocument();
    viewGlobal();
    viewFriends();

    expect(leaderboardService.getFriendsLeaderboard).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFresh([ranking("old", "OldFriend", 1, 1350)]);
    });

    // Re-query the panel because switching tabs unmounts and recreates it.
    const updatedFriendsPanel = screen.getByRole("region", {
      name: "Friends leaderboard",
    });

    expect(
      await within(updatedFriendsPanel).findByText("1,350")
    ).toBeInTheDocument();

    expect(
      within(updatedFriendsPanel).queryByRole("status")
    ).not.toBeInTheDocument();
  });

  test("shows a safe error and retries without stale ELO or affecting Global", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([ranking("global", "GlobalLeader", 1, 1600)]);
    leaderboardService.getFriendsLeaderboard
      .mockResolvedValueOnce([ranking("friend", "OldRating", 1, 1200)])
      .mockRejectedValueOnce(new Error("Friends service temporarily unavailable"))
      .mockResolvedValueOnce([ranking("friend", "UpdatedRating", 1, 1490)]);
    leaderboardService.getAcceptedFriends.mockResolvedValue([{ uid: "friend", username: "UpdatedRating" }]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    expect(await screen.findByText("1,200 ELO")).toBeInTheDocument();
    viewFriends();
    viewGlobal();
    viewFriends();

    const friendsPanel = screen.getByRole("region", { name: "Friends leaderboard" });
    expect(await within(friendsPanel).findByRole("alert")).toHaveTextContent("Friends service temporarily unavailable");
    expect(within(friendsPanel).queryByText("OldRating")).not.toBeInTheDocument();
    fireEvent.click(within(friendsPanel).getByRole("button", { name: "Retry Friends Rankings" }));
    expect(await within(friendsPanel).findByText("UpdatedRating")).toBeInTheDocument();
    expect(within(friendsPanel).getByText("1,490")).toBeInTheDocument();

    viewGlobal();
    expect(screen.getByRole("tabpanel", { name: "Global" })).toHaveTextContent("GlobalLeader");
    expect(leaderboardService.getGlobalLeaderboard).toHaveBeenCalledTimes(1);
  });

  test("ignores a stale refresh result after the authenticated user changes", async () => {
    let resolveOld;
    const oldResponse = new Promise((resolve) => { resolveOld = resolve; });
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard
      .mockResolvedValueOnce([ranking("original", "OriginalFriend", 1, 1200)])
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValueOnce([ranking("other", "OtherAccountFriend", 1, 1700)]);
    leaderboardService.getAcceptedFriends
      .mockResolvedValueOnce([{ uid: "original", username: "OriginalFriend" }])
      .mockResolvedValueOnce([{ uid: "original", username: "OriginalFriend" }])
      .mockResolvedValueOnce([{ uid: "other", username: "OtherAccountFriend" }]);

    const { rerender } = render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    expect(await screen.findByText("1,200 ELO")).toBeInTheDocument();
    viewFriends();
    viewGlobal();
    viewFriends();
    expect(screen.getByRole("region", { name: "Friends leaderboard" })).toHaveTextContent("Updating friends rankings");

    useAuth.mockReturnValue({ user: { uid: "different-user" } });
    rerender(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    const friendsPanel = screen.getByRole("region", { name: "Friends leaderboard" });
    expect(await within(friendsPanel).findByText("OtherAccountFriend")).toBeInTheDocument();
    await act(async () => { resolveOld([ranking("original", "StaleFriend", 1, 2000)]); });
    expect(within(friendsPanel).queryByText("StaleFriend")).not.toBeInTheDocument();
    expect(within(friendsPanel).getByText("1,700")).toBeInTheDocument();
  });

  test("preserves server-supplied tied ELO ranks and their order", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([
      ranking("alice", "Alice", 1, 1500),
      ranking("bob", "Bob", 1, 1500),
      ranking("carol", "Carol", 3, 1300),
    ]);
    leaderboardService.getAcceptedFriends.mockResolvedValue([
      { uid: "alice", username: "Alice" },
      { uid: "bob", username: "Bob" },
      { uid: "carol", username: "Carol" },
    ]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    await screen.findByText("1,300 ELO");
    viewFriends();
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[1].textContent)).toEqual(["Alice", "Bob", "Carol"]);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["1", "1", "3"]);
    expect(screen.getByText(/Equal ELO scores share the same rank/)).toBeInTheDocument();
  });
});

describe("D-03 application-level friends and ELO workflow regression", () => {
  const entry = (uid, username, rank, elo) => ({ uid, username, rank, elo });

  test("D03-T07 refresh displays the new server ELO and updated global rank", async () => {
    leaderboardService.getGlobalLeaderboard
      .mockResolvedValueOnce([
        entry("rival", "Rival", 1, 1010),
        entry("test-user", "Me", 2, 1000),
      ])
      .mockResolvedValueOnce([
        entry("test-user", "Me", 1, 1016),
        entry("rival", "Rival", 2, 1010),
      ]);
    leaderboardService.getUserRanking
      .mockResolvedValueOnce(entry("test-user", "Me", 2, 1000))
      .mockResolvedValueOnce(entry("test-user", "Me", 1, 1016));
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    const globalPanel = screen.getByRole("tabpanel", { name: "Global" });
    expect(await within(globalPanel).findByText("Rival")).toBeInTheDocument();
    expect(await screen.findByText("#2")).toBeInTheDocument();
    expect(within(globalPanel).getAllByRole("row")[1]).toHaveTextContent("Rival");

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await waitFor(() => expect(refreshButton).toBeEnabled());
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(within(globalPanel).getAllByRole("row")[1]).toHaveTextContent("Me");
    });

    expect(await screen.findByText("#1")).toBeInTheDocument();
    expect(within(globalPanel).getByText("1,016")).toBeInTheDocument();
    expect(leaderboardService.getGlobalLeaderboard).toHaveBeenCalledTimes(2);
    expect(leaderboardService.getUserRanking).toHaveBeenCalledTimes(2);
  });

  test("D03-T03/T04 self and duplicate request errors leave friends unchanged", async () => {
    leaderboardService.getGlobalLeaderboard.mockResolvedValue([]);
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
    leaderboardService.getUserRanking.mockResolvedValue(null);
    leaderboardService.sendFriendRequest
      .mockRejectedValueOnce(new Error("Cannot send a friend request to yourself."))
      .mockRejectedValueOnce(new Error("Friend request already exists."));

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole("tab", { name: "Friends" }));
    const input = await screen.findByRole("textbox", { name: "Username" });
    await waitFor(() => expect(input).toBeEnabled());

    fireEvent.change(input, { target: { value: "test-user" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Friend" }));
    expect(await screen.findByText("Cannot send a friend request to yourself.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Add Friend" })).toBeEnabled());

    fireEvent.change(input, { target: { value: "Bob" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Friend" }));
    expect(await screen.findByText("Friend request already exists.")).toBeInTheDocument();

    expect(screen.queryByText(/Friend request sent to/)).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Accepted Friends" })).toHaveTextContent("No accepted friends");
    expect(leaderboardService.getAcceptedFriends).toHaveBeenCalledTimes(1);
    expect(leaderboardService.getFriendRequests).toHaveBeenCalledTimes(1);
  });

  test("D03-T11 failed global refresh hides stale rankings and allows recovery", async () => {
    leaderboardService.getGlobalLeaderboard
      .mockResolvedValueOnce([entry("old", "OldLeader", 1, 1200)])
      .mockRejectedValueOnce(new Error("Unable to retrieve rankings."))
      .mockResolvedValueOnce([entry("new", "RecoveredLeader", 1, 1300)]);
    leaderboardService.getFriendsLeaderboard.mockResolvedValue([]);
    leaderboardService.getUserRanking.mockResolvedValue(null);

    render(<LeaderboardPage currentPage="/leaderboard" onNavigate={() => {}} />);
    const globalPanel = screen.getByRole("tabpanel", { name: "Global" });
    expect(await within(globalPanel).findByText("OldLeader")).toBeInTheDocument();

    const refreshButton = screen.getByRole("button", { name: /Refresh/i });
    await waitFor(() => expect(refreshButton).toBeEnabled());
    fireEvent.click(refreshButton);

    expect(await within(globalPanel).findByRole("alert")).toHaveTextContent("Unable to retrieve rankings.");
    expect(within(globalPanel).queryByText("OldLeader")).not.toBeInTheDocument();

    await waitFor(() => expect(refreshButton).toBeEnabled());
    fireEvent.click(refreshButton);

    expect(await within(globalPanel).findByText("RecoveredLeader")).toBeInTheDocument();
    expect(within(globalPanel).getByText("1,300")).toBeInTheDocument();
    expect(within(globalPanel).queryByText("OldLeader")).not.toBeInTheDocument();
    expect(leaderboardService.getGlobalLeaderboard).toHaveBeenCalledTimes(3);
  });
});
