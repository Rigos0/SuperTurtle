import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import SidebarTop from "./sidebarTop/SidebarTop";

const Style = makeStyles((theme) => ({
  sidebar: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
}));

const Sidebar = () => {
  const classes = Style();
  return (
    <div className={classes.sidebar}>
      <SidebarTop />
    </div>
  );
};

export default Sidebar;
