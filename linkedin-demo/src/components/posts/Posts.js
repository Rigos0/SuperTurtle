import React from "react";
import { useQuery } from "convex/react";
import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import FlipMove from "react-flip-move";
import Post from "./post/Post";
import { DEFAULT_PHOTO } from "../../constants";
import { api } from "../../convex/_generated/api";
import useConvexPosts from "../../hooks/useConvexPosts";
import useConvexUser from "../../hooks/useConvexUser";
import LoadingGate from "../LoadingGate";

const Posts = ({ onNavigateProfile }) => {
  const classes = Style();
  const [sortBy, setSortBy] = React.useState("recent");
  const posts = useConvexPosts(sortBy);
  const user = useConvexUser();
  const isLoading = posts === undefined;

  const postIds = React.useMemo(() => {
    if (!Array.isArray(posts) || posts.length === 0) {
      return [];
    }

    const seenPostIds = new Set();
    const resolvedPostIds = [];

    for (const post of posts) {
      const targetPostId = post.targetPostId ?? post._id;
      if (!targetPostId || seenPostIds.has(targetPostId)) {
        continue;
      }

      seenPostIds.add(targetPostId);
      resolvedPostIds.push(targetPostId);
    }

    return resolvedPostIds;
  }, [posts]);

  const userReactions = useQuery(
    api.likes.getUserReactionsByPostIds,
    user?._id && postIds.length > 0 ? { userId: user._id, postIds } : "skip",
  );
  const reactionCounts = useQuery(
    api.likes.getReactionCountsByPostIds,
    postIds.length > 0 ? { postIds } : "skip",
  );

  const getProfilePhoto = (photoURL) => {
    if (!photoURL || (typeof photoURL === "string" && photoURL.startsWith("/"))) {
      return DEFAULT_PHOTO;
    }
    return photoURL;
  };

  return (
    <div className={classes.posts}>
      <div className={classes.feedSort}>
        <Tabs
          value={sortBy}
          onChange={(_, nextSortBy) => setSortBy(nextSortBy)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="Feed sort"
        >
          <Tab value="recent" label="Recent" className={classes.sortTab} />
          <Tab value="top" label="Top" className={classes.sortTab} />
          <Tab value="following" label="Following" className={classes.sortTab} />
        </Tabs>
      </div>
      <LoadingGate isLoading={isLoading}>
        {posts?.length === 0 ? (
          <Typography variant="body2" color="textSecondary">
            No posts yet.
          </Typography>
        ) : (
          <FlipMove style={{ width: "100%" }}>
            {posts?.map((post) => (
              <Post
                key={post.feedItemId ?? post._id}
                postId={post.targetPostId ?? post._id}
                authorId={post.authorId}
                authorUsername={post.author?.username ?? null}
                likesCount={post.likesCount}
                commentsCount={post.commentsCount}
                repostCount={post.repostCount}
                currentReaction={userReactions?.[post.targetPostId ?? post._id] ?? undefined}
                reactionCounts={reactionCounts?.[post.targetPostId ?? post._id]}
                profile={getProfilePhoto(post.authorPhotoURL ?? post.author?.photoURL)}
                username={post.authorName ?? post.author?.displayName}
                timestamp={post.createdAt}
                description={post.description}
                fileType={post.fileType}
                fileData={post.fileData}
                imageUrls={post.imageUrls}
                isRepost={post.feedItemType === "repost"}
                originalPost={post.originalPost ?? null}
                onNavigateProfile={onNavigateProfile}
              />
            ))}
          </FlipMove>
        )}
      </LoadingGate>
    </div>
  );
};

const Style = makeStyles((theme) => ({
  posts: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  feedSort: {
    width: "100%",
    borderRadius: 10,
    marginBottom: 10,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    overflow: "hidden",
  },
  sortTab: {
    minHeight: 44,
    fontWeight: 600,
    textTransform: "none",
  },
}));

export default Posts;
