import React, { useMemo } from "react";
import { Card, CardContent, Link, List, ListItem, Typography } from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  card: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 10,
    overflow: "hidden",
  },
  section: {
    marginBottom: theme.spacing(2.5),
  },
  heading: {
    color: theme.palette.text.primary,
    fontWeight: 700,
    marginBottom: theme.spacing(0.75),
  },
  body: {
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap",
  },
  list: {
    marginTop: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  listItem: {
    paddingTop: 2,
    paddingBottom: 2,
    color: theme.palette.text.secondary,
  },
  value: {
    color: theme.palette.text.secondary,
  },
}));

const withFallback = (value, fallback = "Not provided") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
};

const normalizeList = (input) => {
  if (Array.isArray(input)) {
    return input
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  return [];
};

const normalizeWebsiteHref = (website) => {
  if (typeof website !== "string") {
    return null;
  }

  const trimmedValue = website.trim();
  if (!trimmedValue) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
};

const renderList = (values, className) => {
  if (!values.length) {
    return (
      <Typography variant="body2" className={className}>
        Not provided
      </Typography>
    );
  }

  return (
    <List dense disablePadding>
      {values.map((value) => (
        <ListItem key={value} disableGutters className={className}>
          {value}
        </ListItem>
      ))}
    </List>
  );
};

const CompanyAboutTab = ({ company }) => {
  const classes = useStyles();
  const theme = useTheme();

  const websiteLabel = withFallback(company?.website);
  const websiteHref = normalizeWebsiteHref(company?.website);
  const locations = useMemo(() => normalizeList(company?.locations), [company?.locations]);
  const specialties = useMemo(() => normalizeList(company?.specialties), [company?.specialties]);

  return (
    <Card
      elevation={0}
      className={classes.card}
      style={{ backgroundColor: theme.palette.background.paper }}
    >
      <CardContent>
        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Description
          </Typography>
          <Typography variant="body2" className={classes.body}>
            {withFallback(company?.description, "No company description available yet.")}
          </Typography>
        </div>

        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Industry
          </Typography>
          <Typography variant="body2" className={classes.value}>
            {withFallback(company?.industry)}
          </Typography>
        </div>

        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Company size
          </Typography>
          <Typography variant="body2" className={classes.value}>
            {withFallback(company?.size)}
          </Typography>
        </div>

        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Website
          </Typography>
          {websiteHref ? (
            <Link
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              variant="body2"
              className={classes.value}
            >
              {websiteLabel}
            </Link>
          ) : (
            <Typography variant="body2" className={classes.value}>
              {websiteLabel}
            </Typography>
          )}
        </div>

        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Founded
          </Typography>
          <Typography variant="body2" className={classes.value}>
            {withFallback(company?.founded)}
          </Typography>
        </div>

        <div className={classes.section}>
          <Typography variant="subtitle1" className={classes.heading}>
            Locations
          </Typography>
          <div className={classes.list}>{renderList(locations, classes.listItem)}</div>
        </div>

        <div>
          <Typography variant="subtitle1" className={classes.heading}>
            Specialties
          </Typography>
          <div className={classes.list}>{renderList(specialties, classes.listItem)}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyAboutTab;
