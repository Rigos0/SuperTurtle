import React from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { makeStyles } from "@material-ui/core/styles";
import { api } from "../../../convex/_generated/api";

const useStyles = makeStyles((theme) => ({
  poll: {
    width: "100%",
    padding: "0 10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  question: {
    margin: 0,
    fontSize: 15,
    fontWeight: 600,
    color: theme.palette.text.primary,
    wordBreak: "break-word",
  },
  options: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  optionButton: {
    width: "100%",
    border: 0,
    padding: 0,
    textAlign: "left",
    background: "transparent",
    cursor: "pointer",
    borderRadius: 10,
    overflow: "hidden",
    "&:disabled": {
      cursor: "not-allowed",
      opacity: 0.75,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  optionTrack: {
    width: "100%",
    position: "relative",
    border: `1px solid ${theme.palette.type === "dark" ? "#455a64" : "#d7dbe0"}`,
    backgroundColor: theme.palette.type === "dark" ? "#1f2a30" : "#f6f9fb",
    minHeight: 42,
  },
  optionFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 0,
    backgroundColor: theme.palette.type === "dark" ? "rgba(129, 199, 132, 0.25)" : "#d7ead9",
    transition: "width 0.2s ease",
  },
  optionFillSelected: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(129, 199, 132, 0.4)" : "#c2e2c5",
  },
  optionContent: {
    position: "relative",
    zIndex: 1,
    minHeight: 42,
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  optionLabel: {
    fontSize: 14,
    color: theme.palette.text.primary,
    wordBreak: "break-word",
  },
  optionMeta: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    whiteSpace: "nowrap",
    fontWeight: 500,
  },
  optionMetaSelected: {
    color: theme.palette.type === "dark" ? "#81c784" : "#2e7d32",
    fontWeight: 700,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    color: theme.palette.text.secondary,
    gap: 8,
  },
  footerStatus: {
    color: theme.palette.type === "dark" ? "#81c784" : "#2e7d32",
    fontWeight: 600,
  },
  footerError: {
    color: "#d32f2f",
    fontWeight: 600,
  },
}));

const PollDisplay = ({ postId }) => {
  const classes = useStyles();
  const { isAuthenticated } = useConvexAuth();
  const vote = useMutation(api.polls.vote);
  const changeVote = useMutation(api.polls.changeVote);

  const poll = useQuery(api.polls.getPoll, postId ? { postId } : "skip");
  const pollId = poll?._id;

  const results = useQuery(api.polls.getResults, pollId ? { pollId } : "skip");
  const userVote = useQuery(api.polls.getUserVote, pollId ? { pollId } : "skip");

  const [optimisticVoteIndex, setOptimisticVoteIndex] = React.useState(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [voteError, setVoteError] = React.useState("");

  React.useEffect(() => {
    if (userVote !== undefined) {
      setOptimisticVoteIndex(userVote?.optionIndex ?? null);
    }
  }, [userVote]);

  if (poll === undefined) {
    return null;
  }

  if (!poll) {
    return null;
  }

  const selectedOptionIndex = optimisticVoteIndex;
  const hasSelectedOption = Number.isInteger(selectedOptionIndex);
  const pollOptions = Array.isArray(results?.options)
    ? results.options
    : poll.options.map((option, optionIndex) => ({
        option,
        optionIndex,
        voteCount: 0,
        percentage: 0,
      }));

  const totalVotes = results?.totalVotes ?? 0;

  const handleVote = async (optionIndex) => {
    if (!pollId || !isAuthenticated || isSubmitting || optionIndex === selectedOptionIndex) {
      return;
    }

    const hadVote = Number.isInteger(selectedOptionIndex);
    const previousVoteIndex = selectedOptionIndex;
    setVoteError("");
    setOptimisticVoteIndex(optionIndex);
    setIsSubmitting(true);

    try {
      if (hadVote) {
        await changeVote({ pollId, optionIndex });
      } else {
        await vote({ pollId, optionIndex });
      }
    } catch (error) {
      console.error("Failed to submit poll vote", error);
      setVoteError("Unable to record vote");
      setOptimisticVoteIndex(previousVoteIndex);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={classes.poll}>
      <p className={classes.question}>{poll.question}</p>
      <div className={classes.options}>
        {pollOptions.map((optionResult) => {
          const isSelected = optionResult.optionIndex === selectedOptionIndex;
          const shouldShowResults = hasSelectedOption;
          const fillPercentage = shouldShowResults
            ? optionResult.percentage
            : isSelected
              ? 100
              : 0;

          return (
            <button
              key={`${pollId}-option-${optionResult.optionIndex}`}
              type="button"
              className={classes.optionButton}
              onClick={() => handleVote(optionResult.optionIndex)}
              disabled={!isAuthenticated || isSubmitting}
            >
              <div className={classes.optionTrack}>
                <span
                  className={`${classes.optionFill} ${isSelected ? classes.optionFillSelected : ""}`}
                  style={{ width: `${fillPercentage}%` }}
                />
                <span className={classes.optionContent}>
                  <span className={classes.optionLabel}>{optionResult.option}</span>
                  {shouldShowResults && (
                    <span
                      className={`${classes.optionMeta} ${
                        isSelected ? classes.optionMetaSelected : ""
                      }`}
                    >
                      {optionResult.voteCount} ({optionResult.percentage}%)
                    </span>
                  )}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <div className={classes.footer}>
        <span>
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </span>
        {voteError ? (
          <span className={classes.footerError}>{voteError}</span>
        ) : hasSelectedOption ? (
          <span className={classes.footerStatus}>{isSubmitting ? "Saving..." : "Vote submitted"}</span>
        ) : !isAuthenticated ? (
          <span>Sign in to vote</span>
        ) : (
          <span>Select an option</span>
        )}
      </div>
    </div>
  );
};

export default PollDisplay;
