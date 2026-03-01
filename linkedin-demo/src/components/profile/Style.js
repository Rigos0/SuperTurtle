import { makeStyles } from "@material-ui/core/styles";

export default makeStyles((theme) => ({
  profile: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    padding: theme.spacing(2, 0),
  },
  card: {
    width: "100%",
    maxWidth: 520,
    padding: theme.spacing(4, 3),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: theme.spacing(1.5),
  },
  avatar: {
    width: 120,
    height: 120,
    marginBottom: theme.spacing(1),
  },
  name: {
    fontWeight: 700,
  },
  title: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
  },
}));
