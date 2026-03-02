import React from "react";
import { useQuery } from "convex/react";
import { Avatar, ClickAwayListener, Paper, Popper, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { api } from "../../convex/_generated/api";
import { DEFAULT_PHOTO } from "../../constants";

const useStyles = makeStyles((theme) => ({
  popper: {
    zIndex: theme.zIndex.modal,
  },
  dropdown: {
    width: "100%",
    maxHeight: 280,
    overflowY: "auto",
    marginTop: 8,
    borderRadius: 8,
    padding: "4px 0",
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  avatar: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  rowContent: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  displayName: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.palette.type === "dark" ? "#e5e7eb" : "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  username: {
    fontSize: 12,
    color: theme.palette.type === "dark" ? "#9ca3af" : "#6b7280",
  },
  stateText: {
    padding: "8px 12px",
    fontSize: 12,
    color: theme.palette.type === "dark" ? "#9ca3af" : "#6b7280",
  },
}));

const normalizeMentionPrefix = (value = "") => value.trim().replace(/^@+/, "").toLowerCase();

const resolvePhoto = (photoURL) => {
  if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
    return DEFAULT_PHOTO;
  }

  return photoURL;
};

const MentionAutocomplete = ({
  anchorEl,
  open,
  query,
  onSelect,
  onClose,
  emptyText = "No matching users.",
  loadingText = "Searching users...",
}) => {
  const classes = useStyles();
  const mentionPrefix = React.useMemo(() => normalizeMentionPrefix(query), [query]);
  const shouldSearch = Boolean(open && mentionPrefix);
  const users = useQuery(
    api.users.searchUsersByPrefix,
    shouldSearch ? { prefix: mentionPrefix } : "skip",
  );

  const userResults = users ?? [];
  const isLoading = shouldSearch && users === undefined;

  const handleSelect = (selectedUser) => {
    if (typeof onSelect === "function") {
      onSelect(selectedUser);
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

  if (!open || !anchorEl || !mentionPrefix) {
    return null;
  }

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="bottom-start"
      className={classes.popper}
      disablePortal
      style={{ width: anchorEl.clientWidth }}
    >
      <ClickAwayListener onClickAway={onClose ?? (() => {})}>
        <Paper className={classes.dropdown} elevation={3}>
          {isLoading ? (
            <Typography className={classes.stateText}>{loadingText}</Typography>
          ) : userResults.length === 0 ? (
            <Typography className={classes.stateText}>{emptyText}</Typography>
          ) : (
            userResults.map((resultUser) => (
              <div
                key={resultUser.username}
                className={classes.row}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(resultUser)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelect(resultUser);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <Avatar
                  className={classes.avatar}
                  src={resolvePhoto(resultUser.photoURL)}
                  alt={resultUser.displayName}
                />
                <div className={classes.rowContent}>
                  <Typography className={classes.displayName}>
                    {resultUser.displayName}
                  </Typography>
                  <Typography className={classes.username}>@{resultUser.username}</Typography>
                </div>
              </div>
            ))
          )}
        </Paper>
      </ClickAwayListener>
    </Popper>
  );
};

export default MentionAutocomplete;
