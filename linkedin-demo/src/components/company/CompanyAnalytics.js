import React from "react";
import { useQuery } from "convex/react";
import { Card, CardContent, Grid, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { Skeleton } from "@material-ui/lab";
import { api } from "../../convex/_generated/api";

const STAT_ITEMS = [
  { key: "totalFollowers", label: "Followers" },
  { key: "totalPosts", label: "Posts" },
  { key: "totalPostLikes", label: "Post Likes" },
];

const formatCount = (value) => (typeof value === "number" ? value.toLocaleString() : "0");

const AnalyticsCard = ({ label, value, loading, theme }) => (
  <Card
    elevation={0}
    style={{
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 12,
      height: "100%",
    }}
  >
    <CardContent>
      {loading ? (
        <Skeleton variant="text" width={80} height={36} />
      ) : (
        <Typography
          variant="h5"
          style={{ color: theme.palette.text.primary, fontWeight: 700, lineHeight: 1.2 }}
        >
          {formatCount(value)}
        </Typography>
      )}
      {loading ? (
        <Skeleton variant="text" width={96} height={24} />
      ) : (
        <Typography variant="body2" style={{ color: theme.palette.text.secondary, marginTop: 6 }}>
          {label}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const CompanyAnalytics = ({ companyId }) => {
  const theme = useTheme();
  const analytics = useQuery(
    api.companies.getCompanyAnalytics,
    companyId ? { companyId } : "skip",
  );

  if (!companyId) {
    return null;
  }

  if (analytics === null) {
    return null;
  }

  const isLoading = analytics === undefined;

  return (
    <Grid container spacing={2}>
      {STAT_ITEMS.map((item) => (
        <Grid item xs={12} sm={4} key={item.key}>
          <AnalyticsCard
            label={item.label}
            value={analytics?.[item.key]}
            loading={isLoading}
            theme={theme}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default CompanyAnalytics;
