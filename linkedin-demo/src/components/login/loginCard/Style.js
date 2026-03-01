import { makeStyles } from "@material-ui/core/styles";

export default makeStyles((theme) => ({
  card: {
    width: 360,
    [theme.breakpoints.down("xs")]: {
      width: "100%",
      border: 0,
      borderRadius: 0,
      boxShadow: "none",
    },
    minHeight: 420,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
  },

  header: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  brand: {
    margin: 0,
    color: "#2e7d32",
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: "-0.03em",
  },

  subtitle: {
    margin: 0,
    color: "#5f6368",
    fontSize: 14,
  },

  authButtons: {
    width: 280,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    "& > button": {
      height: 42,
      borderRadius: 999,
      border: "1px solid transparent",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      "&:hover": {
        transform: "translateY(-1px)",
      },
    },
  },

  guestBtn: {
    backgroundColor: "#2e7d32",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#1b5e20",
    },
  },

  githubBtn: {
    backgroundColor: "#24292e",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#171b20",
    },
  },

  googleBtn: {
    backgroundColor: "#ffffff",
    color: "#202124",
    borderColor: "#dadce0",
    "&:hover": {
      backgroundColor: "#f7f8f8",
    },
  },

  googleMark: {
    width: 18,
    height: 18,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 700,
    fontSize: 16,
    background: "linear-gradient(45deg, #4285f4 25%, #ea4335 25%, #ea4335 50%, #fbbc05 50%, #fbbc05 75%, #34a853 75%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
}));
