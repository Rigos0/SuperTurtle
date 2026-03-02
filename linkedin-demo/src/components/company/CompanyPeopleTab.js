import React, { useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Avatar, Card, CardContent, Paper, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { fade } from "@material-ui/core/styles/colorManipulator";
import PersonIcon from "@material-ui/icons/Person";
import { api } from "../../convex/_generated/api";
import { resolvePhoto } from "../../utils/photo";

const useStyles = makeStyles((theme) => ({
  card: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    overflow: "hidden",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
  },
  personCard: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    padding: theme.spacing(1.25, 1.5),
    cursor: "pointer",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
    "&:hover": {
      backgroundColor: fade(theme.palette.primary.main, 0.06),
      borderColor: fade(theme.palette.primary.main, 0.25),
    },
  },
  avatar: {
    width: 44,
    height: 44,
    backgroundColor: fade(theme.palette.primary.main, 0.12),
    color: theme.palette.primary.main,
    flexShrink: 0,
  },
  personInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
  },
  name: {
    fontWeight: 600,
    color: theme.palette.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  title: {
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  emptyState: {
    color: theme.palette.text.secondary,
  },
}));

const normalizeCompanyName = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

const CompanyPeopleTab = ({ company }) => {
  const classes = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const companyName = useMemo(() => normalizeCompanyName(company?.name), [company?.name]);
  const employees = useQuery(
    api.companyPeople.getCompanyPeople,
    companyName ? { companyName } : "skip",
  );

  const visibleEmployees = useMemo(
    () =>
      Array.isArray(employees)
        ? employees.filter(
            (person) => typeof person.username === "string" && person.username.trim().length > 0,
          )
        : [],
    [employees],
  );

  if (!companyName) {
    return (
      <Card
        elevation={0}
        className={classes.card}
        style={{ backgroundColor: theme.palette.background.paper }}
      >
        <CardContent>
          <Typography variant="body2" className={classes.emptyState}>
            Company details are unavailable.
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
        {employees === undefined ? (
          <Typography variant="body2" className={classes.emptyState}>
            Loading people...
          </Typography>
        ) : visibleEmployees.length === 0 ? (
          <Typography variant="body2" className={classes.emptyState}>
            No people found for this company yet.
          </Typography>
        ) : (
          <div className={classes.list}>
            {visibleEmployees.map((person) => {
              const username = person.username.trim().toLowerCase();

              const handleOpenProfile = () => {
                navigate(`/${encodeURIComponent(username)}`);
              };

              return (
                <Paper
                  key={person._id}
                  elevation={0}
                  role="button"
                  tabIndex={0}
                  className={classes.personCard}
                  onClick={handleOpenProfile}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenProfile();
                    }
                  }}
                >
                  <Avatar
                    src={resolvePhoto(person.photoURL)}
                    alt={person.displayName}
                    className={classes.avatar}
                  >
                    {!person.photoURL ? <PersonIcon fontSize="small" /> : null}
                  </Avatar>
                  <div className={classes.personInfo}>
                    <Typography variant="body1" className={classes.name}>
                      {person.displayName}
                    </Typography>
                    <Typography variant="body2" className={classes.title}>
                      {person.title || "No title listed"}
                    </Typography>
                  </div>
                </Paper>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CompanyPeopleTab;
