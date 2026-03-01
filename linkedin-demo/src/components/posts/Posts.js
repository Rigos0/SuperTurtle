import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import FlipMove from "react-flip-move";
import Post from "./post/Post";
import Animation from "../animations/Animation";
import Loading from "../../assets/images/loading-dots.json";
import { mockPosts } from "../../mock/posts";

const Posts = () => {
  const classes = Style();

  return (
    <div className={classes.posts}>
      {mockPosts.length === 0 ? (
        <Animation src={Loading} />
      ) : (
        <FlipMove style={{ width: "100%" }}>
          {mockPosts.map((post) => (
            <Post
              key={post.id}
              profile={post.data.profile}
              username={post.data.username}
              timestamp={post.data.timestamp}
              description={post.data.description}
              fileType={post.data.fileType}
              fileData={post.data.fileData}
            />
          ))}
        </FlipMove>
      )}
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
