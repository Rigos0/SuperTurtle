import React, { forwardRef, useEffect, useState } from "react";
import Avatar from "@material-ui/core/Avatar";
import Paper from "@material-ui/core/Paper";
import MoreHorizOutlinedIcon from "@material-ui/icons/MoreHorizOutlined";
import ThumbUpAltOutlinedIcon from "@material-ui/icons/ThumbUpAltOutlined";
import ReplyOutlinedIcon from "@material-ui/icons/ReplyOutlined";
import FiberManualRecordRoundedIcon from "@material-ui/icons/FiberManualRecordRounded";
import SendIcon from "@material-ui/icons/Send";
import CommentOutlinedIcon from "@material-ui/icons/CommentOutlined";
import ReactPlayer from "react-player";
import ReactTimeago from "react-timeago";
import * as images from "../../../assets/images/images";
import Style from "./Style";

const Post = forwardRef(
  ({ profile, username, timestamp, description, fileType, fileData, onNavigateProfile }, ref) => {
    const classes = Style();

    const [likesCount, setLikesCount] = useState(1);
    const [commentsCount, setCommentsCount] = useState(1);
    const [heartIcontOrder, setHeartIcontOrder] = useState(1);
    const [smileIconOrder, setSmileIconOrder] = useState(1);
    const [thumsUpIconOrder, setThumsUpIconOrder] = useState(1);

    const capitalize = (_string) => {
      return _string.charAt(0).toUpperCase() + _string.slice(1);
    };

    const postImageRef = React.useRef(null);

    const PostImage = React.forwardRef((props, ref) => {
      return <img src={props.src} alt="post" ref={ref} />;
    });

    useEffect(() => {
      setLikesCount(Math.floor(Math.random() * 1000) + 1);
      setCommentsCount(Math.floor(Math.random() * 10) + 1);
      setHeartIcontOrder(Math.floor(Math.random() * (3 - 1 + 1)) + 1);
      setSmileIconOrder(Math.floor(Math.random() * (3 - 1 + 1)) + 1);
      setThumsUpIconOrder(Math.floor(Math.random() * (3 - 1 + 1)) + 1);
    }, []);

    const Reactions = () => {
      return (
        <div className={classes.footer__stats}>
          <div>
            <img
              src={images.LinkedInLike}
              alt="linked-in-reaction-1"
              style={{ order: `${heartIcontOrder} ` }}
            />
            <img
              src={images.LinkedInLove}
              alt="linked-in-reaction-2"
              style={{ order: `${smileIconOrder} ` }}
            />
            <img
              src={images.LinkedInApplaud}
              alt="linked-in-reaction-3"
              style={{ order: `${thumsUpIconOrder} ` }}
            />
          </div>
          <h4>{likesCount}</h4>
          <FiberManualRecordRoundedIcon
            style={{ fontSize: 8, color: "grey", paddingLeft: "3px" }}
          />
          <h4>{commentsCount} comments</h4>
        </div>
      );
    };

    return (
      <Paper ref={ref} className={classes.post}>
        <div className={classes.post__header}>
          <Avatar src={profile} onClick={onNavigateProfile} />
          <div className={classes.header__info}>
            <h4 onClick={onNavigateProfile}>{capitalize(username)}</h4>
            <p>
              <ReactTimeago date={new Date(timestamp?.toDate()).toUTCString()} units="minute" />
            </p>
          </div>
          <MoreHorizOutlinedIcon />
        </div>
        <div className={classes.post__body}>
          <div className={classes.body__description}>
            <p>{description}</p>
          </div>
          {fileData && (
            <div className={classes.body__image}>
              {fileType === "image" ? (
                // <img src={fileData} alt="post" />
                <PostImage ref={postImageRef} src={fileData} />
              ) : (
                <ReactPlayer url={fileData} controls={true} style={{ height: "auto !important" }} />
              )}
            </div>
          )}
        </div>
        <div className={classes.post__footer}>
          <Reactions />
          <div className={classes.footer__actions}>
            <div className={classes.action__icons}>
              <ThumbUpAltOutlinedIcon style={{ transform: "scaleX(-1)" }} />
              <h4>Like</h4>
            </div>
            <div className={classes.action__icons}>
              <CommentOutlinedIcon />
              <h4>Comment</h4>
            </div>
            <div className={classes.action__icons}>
              <ReplyOutlinedIcon style={{ transform: "scaleX(-1)" }} />
              <h4>Share</h4>
            </div>
            <div className={classes.action__icons}>
              <SendIcon style={{ transform: "rotate(-45deg)" }} />
              <h4>Send</h4>
            </div>
          </div>
        </div>
      </Paper>
    );
  }
);

export default Post;
