import { makeStyles } from "@material-ui/core/styles";

export default makeStyles((theme) => ({
  network: {
    width: "100%",
  },
  controls: {
    width: "100%",
    marginBottom: theme.spacing(1.5),
  },
  searchField: {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.background.paper,
    },
  },
  stateCard: {
    width: "100%",
    padding: theme.spacing(3),
    marginTop: theme.spacing(1.5),
  },
  grid: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  card: {
    width: "100%",
    boxSizing: "border-box",
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(1.5, 2),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    borderRadius: 8,
    cursor: "pointer",
    outline: "none",
    transition: "box-shadow 150ms ease, transform 150ms ease",
    "&:hover": {
      boxShadow: "0px 4px 14px rgba(46, 125, 50, 0.18)",
      transform: "translateY(-1px)",
    },
    "&:focus-visible": {
      boxShadow: "0px 0px 0px 3px rgba(46, 125, 50, 0.25)",
    },
  },
  avatar: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  info: {
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    flexGrow: 1,
  },
  displayName: {
    fontWeight: 700,
    fontSize: "0.95rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  title: {
    color: theme.palette.text.secondary,
    fontSize: "0.8rem",
    lineHeight: 1.45,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  location: {
    color: theme.palette.text.secondary,
    fontSize: "0.75rem",
    marginTop: theme.spacing(0.25),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  connectButton: {
    borderColor: "#2e7d32",
    color: "#2e7d32",
    borderRadius: 16,
    textTransform: "none",
    fontWeight: 600,
    minWidth: 92,
    "&:hover": {
      borderColor: "#2e7d32",
      backgroundColor: "rgba(46, 125, 50, 0.08)",
    },
  },
}));
