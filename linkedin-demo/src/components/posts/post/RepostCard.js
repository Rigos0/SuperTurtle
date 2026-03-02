import React from "react";
import Avatar from "@material-ui/core/Avatar";
import ReactTimeago from "react-timeago";

const RepostCard = ({
  classes,
  originalPost,
  postId,
  canNavigateOriginalProfile,
  onOriginalProfileClick,
  resolvePhoto,
  renderMedia,
  originalPostImages,
}) => {
  if (!originalPost) {
    return null;
  }

  const originalAuthorDisplayName = originalPost.author?.displayName ?? "Unknown user";

  return (
    <div className={classes.repost__embed}>
      <div className={classes.repost__embedHeader}>
        <Avatar
          className={classes.repost__embedAvatar}
          src={resolvePhoto(originalPost.author?.photoURL)}
          onClick={canNavigateOriginalProfile ? onOriginalProfileClick : undefined}
          style={canNavigateOriginalProfile ? { cursor: "pointer" } : undefined}
        />
        <div className={classes.repost__embedInfo}>
          <h5
            onClick={canNavigateOriginalProfile ? onOriginalProfileClick : undefined}
            style={canNavigateOriginalProfile ? { cursor: "pointer" } : { cursor: "default" }}
          >
            {originalAuthorDisplayName}
          </h5>
          <p>
            <ReactTimeago date={new Date(originalPost.createdAt).toUTCString()} units="minute" />
          </p>
        </div>
      </div>
      {typeof originalPost.description === "string" &&
        originalPost.description.trim().length > 0 && (
          <p className={classes.repost__embedDescription}>{originalPost.description}</p>
      )}
      {renderMedia(
        originalPost.fileType,
        originalPost.fileData,
        originalPostImages,
        `embedded-${postId}`,
      )}
    </div>
  );
};

export default RepostCard;
