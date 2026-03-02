import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { Card, CardContent, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { api } from "../../convex/_generated/api";
import useConvexUser from "../../hooks/useConvexUser";
import { resolvePhoto } from "../../utils/photo";
import LoadingGate from "../LoadingGate";
import Post from "../posts/post/Post";

const useStyles = makeStyles((theme) => ({
  card: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    overflow: "hidden",
  },
  emptyState: {
    color: theme.palette.text.secondary,
  },
}));

const CompanyPostsTab = ({ companyId, onNavigateProfile }) => {
  const classes = useStyles();
  const theme = useTheme();
  const user = useConvexUser();

  const posts = useQuery(api.posts.getCompanyPosts, companyId ? { companyId } : "skip");
  const isLoading = Boolean(companyId) && posts === undefined;
  const postIds = useMemo(() => (posts ?? []).map((post) => post._id), [posts]);
  const userReactions = useQuery(
    api.likes.getUserReactionsByPostIds,
    user?._id && postIds.length > 0 ? { userId: user._id, postIds } : "skip",
  );
  const reactionCounts = useQuery(
    api.likes.getReactionCountsByPostIds,
    postIds.length > 0 ? { postIds } : "skip",
  );

  if (!companyId) {
    return (
      <Card
        elevation={0}
        className={classes.card}
        style={{ backgroundColor: theme.palette.background.paper }}
      >
        <CardContent>
          <Typography variant="body2" className={classes.emptyState}>
            Company posts are unavailable.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={0}
      className={classes.card}
      style={{ backgroundColor: theme.palette.background.paper }}
    >
      <CardContent>
        <LoadingGate isLoading={isLoading}>
          {posts?.length === 0 ? (
            <Typography variant="body2" className={classes.emptyState}>
              No posts yet.
            </Typography>
          ) : (
            posts?.map((post) => (
              <Post
                key={post._id}
                postId={post._id}
                authorId={post.authorId}
                authorUsername={post.author?.username ?? null}
                likesCount={post.likesCount}
                commentsCount={post.commentsCount}
                repostCount={post.repostCount}
                currentReaction={userReactions?.[post._id] ?? undefined}
                reactionCounts={reactionCounts?.[post._id]}
                profile={resolvePhoto(post.authorPhotoURL ?? post.author?.photoURL)}
                username={post.authorName ?? post.author?.displayName}
                timestamp={post.createdAt}
                isEdited={Boolean(post.isEdited)}
                description={post.description}
                postType={post.type ?? "post"}
                articleTitle={post.articleTitle}
                articleBody={post.articleBody}
                fileType={post.fileType}
                fileData={post.fileData}
                imageUrls={post.imageUrls}
                onNavigateProfile={onNavigateProfile}
              />
            ))
          )}
        </LoadingGate>
      </CardContent>
    </Card>
  );
};

export default CompanyPostsTab;
