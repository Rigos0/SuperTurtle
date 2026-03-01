import React, { useEffect, useState } from "react";
import { Paper, Avatar, Divider } from "@material-ui/core";
import LabelImportantIcon from "@material-ui/icons/LabelImportant";
import useConvexUser from "../../../hooks/useConvexUser";
import Style from "./Style";

const SidebarTop = () => {
  const classes = Style();
  const user = useConvexUser();
  const [viewed, setViewed] = useState(1);
  const [connections, setConnections] = useState(1);

  useEffect(() => {
    setViewed(Math.floor(Math.random() * 100));
    setConnections(Math.floor(Math.random() * 1000));
  }, []);

  return (
    <Paper className={classes.sidebar}>
      <div
        className={classes.cover}
        style={{
          backgroundImage: `url("https://tandsgo.com/wp-content/uploads/2020/02/Abstract-blue-and-orange-pattern.jpg")`,
        }}
      ></div>
      <Avatar src={user?.photoURL} />
      <h4>{user?.displayName ?? "Guest User"}</h4>
      <div className={classes.stats}>
        <Divider />
        <div className={classes.stat}>
          <h4>Who viewed your profile</h4>
          <p>{viewed}</p>
        </div>
        <div className={classes.stat}>
          <h4>Connections</h4>
          <p>{connections}</p>
        </div>
        <Divider />
      </div>
      <div className={classes.myItems}>
        <LabelImportantIcon style={{ transform: "rotate(-90deg)" }} />
        <h4>My Items</h4>
      </div>
    </Paper>
  );
};

export default SidebarTop;
