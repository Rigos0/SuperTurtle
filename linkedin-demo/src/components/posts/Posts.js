import React from "react";
import { useQuery } from "convex/react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import FlipMove from "react-flip-move";
import Post from "./post/Post";
import { DEFAULT_PHOTO } from "../../constants";
import { api } from "../../convex/_generated/api";
import useConvexPosts from "../../hooks/useConvexPosts";
import useConvexUser from "../../hooks/useConvexUser";
import LoadingGate from "../LoadingGate";

const Posts = ({ onNavigateProfile }) => {
  const classes = Style();
  const posts = useConvexPosts();
  const user = useConvexUser();
  const isLoading = posts === undefined;

  const postIds = React.useMemo(
    () => (posts ?? []).map((post) => post._id),
    [posts],
  );

  const likeStatuses = useQuery(
    api.likes.getLikeStatuses,
    user?._id && postIds.length > 0 ? { userId: user._id, postIds } : "skip",
  );

  const getProfilePhoto = (photoURL) => {
    if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
      return DEFAULT_PHOTO;
    }
    return photoURL;
  };

  return (
    <div className={classes.posts}>
      <LoadingGate isLoading={isLoading}>
        {posts?.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No posts yet.
          </Typography>
        ) : (
          <FlipMove style={{ width: "100%" }}>
            {posts?.map((post) => (
              <Post
                key={post._id}
                postId={post._id}
                authorId={post.authorId}
                authorUsername={post.author?.username ?? null}
                likesCount={post.likesCount}
                commentsCount={post.commentsCount}
                liked={likeStatuses?.[post._id] ?? undefined}
                profile={getProfilePhoto(post.authorPhotoURL ?? post.author?.photoURL)}
                username={post.authorName ?? post.author?.displayName}
                timestamp={post.createdAt}
                description={post.description}
                fileType={post.fileType}
                fileData={post.fileData}
                onNavigateProfile={onNavigateProfile}
              />
            ))}
          </FlipMove>
        )}
      </LoadingGate>
    </div>
  );
};

const Style = makeStyles(() => ({
  posts: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
}));

export default Posts;
