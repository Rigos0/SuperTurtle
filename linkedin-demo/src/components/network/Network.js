import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Avatar, Button, Paper, TextField, Typography } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { api } from "../../convex/_generated/api";
import useConvexUser from "../../hooks/useConvexUser";
import useErrorToast from "../../hooks/useErrorToast";
import { resolvePhoto } from "../../utils/photo";
import ConfirmDialog from "../common/ConfirmDialog";
import LoadingGate from "../LoadingGate";
import Style from "./Style";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 250;

const NetworkUserCard = React.memo(({
  candidateUser,
  authUserId,
  canConnect,
  classes,
  onNavigateProfile,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  removeConnection,
  followUser,
  unfollowUser,
  showError,
}) => {
  const connectionStatus = candidateUser.connectionStatus ?? { status: "none" };
  const connectionState = connectionStatus.status ?? "none";
  const connectionCount = candidateUser.connectionCount ?? 0;
  const mutualConnectionsCount = candidateUser.mutualConnectionsCount ?? 0;
  const isFollowing = Boolean(candidateUser.isFollowing);
  const candidateUsername = candidateUser?.username ?? null;
  const [isConnectionActionPending, setIsConnectionActionPending] = useState(false);
  const [isFollowActionPending, setIsFollowActionPending] = useState(false);
  const [isConnectedActionHovered, setIsConnectedActionHovered] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);

  useEffect(() => {
    if (connectionState !== "accepted") {
      setIsConnectedActionHovered(false);
    }
  }, [connectionState]);

  const handleConnect = async (event) => {
    event.stopPropagation();
    if (!authUserId || !candidateUser?._id || isConnectionActionPending) {
      return;
    }

    setIsConnectionActionPending(true);
    try {
      await sendConnectionRequest({
        fromUserId: authUserId,
        toUserId: candidateUser._id,
      });
    } catch (error) {
      console.error("Failed to send connection request:", error);
      showError("Failed to send connection request. Please try again.");
    } finally {
      setIsConnectionActionPending(false);
    }
  };

  const handleAccept = async (event) => {
    event.stopPropagation();
    if (!connectionStatus?.connectionId || isConnectionActionPending) {
      return;
    }

    setIsConnectionActionPending(true);
    try {
      await acceptConnection({ connectionId: connectionStatus.connectionId });
    } catch (error) {
      console.error("Failed to accept connection request:", error);
      showError("Failed to accept connection request. Please try again.");
    } finally {
      setIsConnectionActionPending(false);
    }
  };

  const handleReject = async (event) => {
    event.stopPropagation();
    if (!connectionStatus?.connectionId || isConnectionActionPending) {
      return;
    }

    setIsConnectionActionPending(true);
    try {
      await rejectConnection({ connectionId: connectionStatus.connectionId });
    } catch (error) {
      console.error("Failed to reject connection request:", error);
      showError("Failed to reject connection request. Please try again.");
    } finally {
      setIsConnectionActionPending(false);
    }
  };

  const handleRemove = (event) => {
    event.stopPropagation();
    if (!connectionStatus?.connectionId || isConnectionActionPending) {
      return;
    }

    setIsRemoveDialogOpen(true);
  };

  const handleRemoveDialogClose = () => {
    if (isConnectionActionPending) {
      return;
    }

    setIsRemoveDialogOpen(false);
  };

  const handleConfirmRemove = async () => {
    if (!connectionStatus?.connectionId || isConnectionActionPending) {
      return;
    }

    setIsConnectionActionPending(true);
    try {
      await removeConnection({ connectionId: connectionStatus.connectionId });
      setIsConnectedActionHovered(false);
      setIsRemoveDialogOpen(false);
    } catch (error) {
      console.error("Failed to remove connection:", error);
      showError("Failed to remove connection. Please try again.");
    } finally {
      setIsConnectionActionPending(false);
    }
  };

  const handleToggleFollow = async (event) => {
    event.stopPropagation();
    if (!authUserId || !candidateUser?._id || isFollowActionPending) {
      return;
    }

    setIsFollowActionPending(true);
    try {
      if (isFollowing) {
        await unfollowUser({
          followerId: authUserId,
          followedId: candidateUser._id,
        });
      } else {
        await followUser({
          followerId: authUserId,
          followedId: candidateUser._id,
        });
      }
    } catch (error) {
      console.error("Failed to update follow state:", error);
      showError("Failed to update follow state. Please try again.");
    } finally {
      setIsFollowActionPending(false);
    }
  };

  const renderConnectionAction = () => {
    if (connectionState === "pending" && connectionStatus?.direction === "received") {
      return (
        <>
          <Button
            variant="contained"
            size="small"
            className={classes.acceptButton}
            onClick={handleAccept}
            disabled={isConnectionActionPending}
          >
            Accept
          </Button>
          <Button
            variant="outlined"
            size="small"
            className={classes.rejectButton}
            onClick={handleReject}
            disabled={isConnectionActionPending}
          >
            Reject
          </Button>
        </>
      );
    }

    if (connectionState === "accepted") {
      return (
        <Button
          variant="outlined"
          size="small"
          className={classes.connectButton}
          onClick={handleRemove}
          onMouseEnter={() => setIsConnectedActionHovered(true)}
          onMouseLeave={() => setIsConnectedActionHovered(false)}
          onFocus={() => setIsConnectedActionHovered(true)}
          onBlur={() => setIsConnectedActionHovered(false)}
          disabled={isConnectionActionPending}
          style={{
            borderColor: isConnectedActionHovered ? "#c62828" : "#2e7d32",
            color: isConnectedActionHovered ? "#c62828" : "#2e7d32",
          }}
        >
          {isConnectedActionHovered ? "Remove" : "Connected ✓"}
        </Button>
      );
    }

    if (connectionState === "pending") {
      return (
        <Button
          variant="outlined"
          size="small"
          disabled
          className={`${classes.connectButton} ${classes.connectButtonPending}`}
        >
          Pending
        </Button>
      );
    }

    return (
      <Button
        variant="outlined"
        size="small"
        className={classes.connectButton}
        onClick={handleConnect}
        disabled={isConnectionActionPending}
      >
        Connect
      </Button>
    );
  };

  return (
    <>
      <Paper
        elevation={1}
        className={classes.card}
        role="button"
        tabIndex={0}
        onClick={() =>
          onNavigateProfile({
            username: candidateUsername,
            userId: candidateUser._id,
          })
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onNavigateProfile({
              username: candidateUsername,
              userId: candidateUser._id,
            });
          }
        }}
      >
        <Avatar
          src={resolvePhoto(candidateUser.photoURL)}
          alt={candidateUser.displayName}
          className={classes.avatar}
        />
        <div className={classes.info}>
          <Typography className={classes.displayName}>{candidateUser.displayName}</Typography>
          <Typography className={classes.title}>{candidateUser.title}</Typography>
          <Typography className={classes.location}>
            {candidateUser.location?.trim().length > 0
              ? candidateUser.location
              : "Location not listed"}
          </Typography>
          <Typography className={classes.connectionCount}>{connectionCount} connections</Typography>
          {authUserId && (
            <Typography className={classes.mutualConnectionCount}>
              {mutualConnectionsCount} mutual connection
              {mutualConnectionsCount === 1 ? "" : "s"}
            </Typography>
          )}
        </div>
        {canConnect && (
          <div className={classes.actionRow}>
            {renderConnectionAction()}
            <Button
              variant={isFollowing ? "contained" : "outlined"}
              size="small"
              className={`${classes.followButton} ${
                isFollowing ? classes.followButtonFollowing : ""
              }`}
              onClick={handleToggleFollow}
              disabled={isFollowActionPending}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          </div>
        )}
      </Paper>
      <ConfirmDialog
        open={isRemoveDialogOpen}
        onClose={handleRemoveDialogClose}
        onConfirm={handleConfirmRemove}
        description={`Remove ${candidateUser.displayName} from your connections?`}
        confirmLabel="Remove connection"
        isPending={isConnectionActionPending}
        dialogId={`remove-connection-dialog-title-${candidateUser._id}`}
      />
    </>
  );
});

const Network = ({ onNavigateProfile }) => {
  const classes = Style();
  const authUser = useConvexUser();
  const sendConnectionRequest = useMutation(api.connections.sendConnectionRequest);
  const acceptConnection = useMutation(api.connections.acceptConnection);
  const rejectConnection = useMutation(api.connections.rejectConnection);
  const removeConnection = useMutation(api.connections.removeConnection);
  const followUser = useMutation(api.follows.followUser);
  const unfollowUser = useMutation(api.follows.unfollowUser);
  const pendingRequests = useQuery(
    api.connections.listPendingRequests,
    authUser?._id ? { userId: authUser._id } : "skip",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [displayedUsers, setDisplayedUsers] = useState([]);
  const [pendingRequestActionIds, setPendingRequestActionIds] = useState(() => new Set());
  const { showError, ErrorToast } = useErrorToast();
  const canConnect = Boolean(authUser?._id);
  const limit = (page + 1) * PAGE_SIZE;

  const networkPage = useQuery(api.users.listNetworkUsers, {
    searchTerm: debouncedSearchTerm || undefined,
    offset: 0,
    limit,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (Array.isArray(networkPage?.users)) {
      setDisplayedUsers(networkPage.users);
    }
  }, [networkPage]);

  const users = displayedUsers;

  const pendingRequestList = useMemo(() => pendingRequests ?? [], [pendingRequests]);
  const usersLoading = networkPage === undefined && displayedUsers.length === 0;
  const usersLoadingMore = page > 0 && networkPage === undefined;
  const hasMore = networkPage?.hasMore ?? true;

  const pendingRequestsLoadingContent = (
    <Paper className={classes.pendingSection} elevation={1}>
      <Skeleton variant="text" width={160} height={30} />
      <div className={classes.pendingRequestsList}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`pending-skeleton-${index}`} className={classes.pendingRequestCard}>
            <Skeleton variant="circle" width={52} height={52} />
            <div className={classes.info}>
              <Skeleton variant="text" width={140} height={24} />
              <Skeleton variant="text" width={110} height={20} />
            </div>
            <div className={classes.actionRow}>
              <Skeleton
                variant="rect"
                width={78}
                height={32}
                style={{ borderRadius: 16 }}
              />
              <Skeleton
                variant="rect"
                width={78}
                height={32}
                style={{ borderRadius: 16 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Paper>
  );

  const usersLoadingContent = (
    <div className={classes.grid}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Paper key={`network-skeleton-${index}`} elevation={1} className={classes.card}>
          <Skeleton variant="circle" width={52} height={52} />
          <div className={classes.info}>
            <Skeleton variant="text" width="56%" height={24} />
            <Skeleton variant="text" width="48%" height={20} />
            <Skeleton variant="text" width="38%" height={18} />
          </div>
          <div className={classes.actionRow}>
            <Skeleton variant="rect" width={92} height={32} style={{ borderRadius: 16 }} />
            <Skeleton variant="rect" width={92} height={32} style={{ borderRadius: 16 }} />
          </div>
        </Paper>
      ))}
    </div>
  );

  return (
    <div className={classes.network}>
      <div className={classes.controls}>
        <TextField
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
            setPage(0);
            setDisplayedUsers([]);
          }}
          placeholder="Search your network"
          variant="outlined"
          size="small"
          fullWidth
          className={classes.searchField}
          inputProps={{ "aria-label": "Search users in network" }}
        />
      </div>
      {authUser?._id && (
        <LoadingGate
          isLoading={pendingRequests === undefined}
          loadingContent={pendingRequestsLoadingContent}
        >
          <Paper className={classes.pendingSection} elevation={1}>
            <Typography className={classes.pendingSectionTitle}>Pending Requests</Typography>
            {pendingRequestList.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No pending requests.
              </Typography>
            ) : (
              <div className={classes.pendingRequestsList}>
                {pendingRequestList.map((request) => {
                  const isRequestActionPending = pendingRequestActionIds.has(request.connectionId);

                  return (
                    <Paper
                      key={request.connectionId}
                      elevation={0}
                      className={classes.pendingRequestCard}
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        onNavigateProfile({
                          username: request.user.username ?? null,
                          userId: request.user._id,
                        })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onNavigateProfile({
                            username: request.user.username ?? null,
                            userId: request.user._id,
                          });
                        }
                      }}
                    >
                      <Avatar
                        src={resolvePhoto(request.user.photoURL)}
                        alt={request.user.displayName}
                        className={classes.avatar}
                      />
                      <div className={classes.info}>
                        <Typography className={classes.displayName}>
                          {request.user.displayName}
                        </Typography>
                        <Typography className={classes.title}>
                          {request.user.title || "No title listed"}
                        </Typography>
                      </div>
                      <div className={classes.actionRow}>
                        <Button
                          variant="contained"
                          size="small"
                          className={classes.acceptButton}
                          disabled={isRequestActionPending}
                          onClick={async (event) => {
                            event.stopPropagation();
                            if (isRequestActionPending) {
                              return;
                            }

                            setPendingRequestActionIds((prev) => {
                              const next = new Set(prev);
                              next.add(request.connectionId);
                              return next;
                            });

                            try {
                              await acceptConnection({ connectionId: request.connectionId });
                            } catch (error) {
                              console.error("Failed to accept request:", error);
                              showError("Failed to accept connection request. Please try again.");
                            } finally {
                              setPendingRequestActionIds((prev) => {
                                const next = new Set(prev);
                                next.delete(request.connectionId);
                                return next;
                              });
                            }
                          }}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          className={classes.rejectButton}
                          disabled={isRequestActionPending}
                          onClick={async (event) => {
                            event.stopPropagation();
                            if (isRequestActionPending) {
                              return;
                            }

                            setPendingRequestActionIds((prev) => {
                              const next = new Set(prev);
                              next.add(request.connectionId);
                              return next;
                            });

                            try {
                              await rejectConnection({ connectionId: request.connectionId });
                            } catch (error) {
                              console.error("Failed to reject request:", error);
                              showError("Failed to reject connection request. Please try again.");
                            } finally {
                              setPendingRequestActionIds((prev) => {
                                const next = new Set(prev);
                                next.delete(request.connectionId);
                                return next;
                              });
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </Paper>
                  );
                })}
              </div>
            )}
          </Paper>
        </LoadingGate>
      )}
      <LoadingGate isLoading={usersLoading} loadingContent={usersLoadingContent}>
        <>
          <div className={classes.grid}>
            {users.map((candidateUser) => (
              <NetworkUserCard
                key={candidateUser._id}
                candidateUser={candidateUser}
                authUserId={authUser?._id ?? null}
                canConnect={canConnect}
                classes={classes}
                onNavigateProfile={onNavigateProfile}
                sendConnectionRequest={sendConnectionRequest}
                acceptConnection={acceptConnection}
                rejectConnection={rejectConnection}
                removeConnection={removeConnection}
                followUser={followUser}
                unfollowUser={unfollowUser}
                showError={showError}
              />
            ))}
          </div>
          {users.length === 0 && (
            <Paper className={classes.stateCard} elevation={1}>
              <Typography variant="body2" color="textSecondary">
                {debouncedSearchTerm
                  ? `No people match "${searchTerm.trim()}".`
                  : "No people to show yet."}
              </Typography>
            </Paper>
          )}
          {users.length > 0 && hasMore && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => setPage((previousPage) => previousPage + 1)}
                disabled={usersLoadingMore}
              >
                {usersLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      </LoadingGate>
      <ErrorToast />
    </div>
  );
};

export default Network;
