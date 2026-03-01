import React from "react";
import { Paper } from "@material-ui/core";
import { useAuthActions } from "@convex-dev/auth/react";
import Style from "./Style";

const LoginCard = () => {
  const classes = Style();
  const authActions = useAuthActions();
  const signIn = authActions?.signIn ?? (() => Promise.resolve());

  return (
    <Paper elevation={3} className={classes.card}>
      <header className={classes.header}>
        <h1 className={classes.brand}>🐢 Turtle In</h1>
        <p className={classes.subtitle}>Sign in to continue</p>
      </header>

      <div className={classes.authButtons}>
        <button className={classes.guestBtn} onClick={() => signIn("anonymous")} type="button">
          🐢 Continue as Guest
        </button>
        <button className={classes.githubBtn} onClick={() => signIn("github")} type="button">
          Sign in with GitHub
        </button>
        <button className={classes.googleBtn} onClick={() => signIn("google")} type="button">
          <span className={classes.googleMark}>G</span>
          <span>Sign in with Google</span>
        </button>
      </div>
    </Paper>
  );
};

export default LoginCard;
