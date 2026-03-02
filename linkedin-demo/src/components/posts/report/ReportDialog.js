import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  makeStyles,
} from "@material-ui/core";

export const REPORT_REASONS = [
  "Spam",
  "Harassment",
  "Misinformation",
  "Inappropriate content",
  "Other",
];

const useStyles = makeStyles((theme) => ({
  helperText: {
    marginTop: theme.spacing(1),
  },
  detailsField: {
    marginTop: theme.spacing(2),
  },
}));

const ReportDialog = ({
  open,
  onClose,
  onSubmit,
  loading = false,
  initialReason = "",
  initialDetails = "",
}) => {
  const classes = useStyles();
  const [reason, setReason] = React.useState(initialReason);
  const [details, setDetails] = React.useState(initialDetails);
  const [showReasonError, setShowReasonError] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setReason(initialReason);
    setDetails(initialDetails);
    setShowReasonError(false);
  }, [initialDetails, initialReason, open]);

  const handleClose = () => {
    if (loading) {
      return;
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const normalizedReason = typeof reason === "string" ? reason.trim() : "";
    if (!normalizedReason) {
      setShowReasonError(true);
      return;
    }

    setShowReasonError(false);

    if (typeof onSubmit === "function") {
      await onSubmit({
        reason: normalizedReason,
        details: details.trim(),
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="report-dialog-title"
    >
      <DialogTitle id="report-dialog-title">Report post</DialogTitle>
      <DialogContent dividers>
        <FormControl variant="outlined" fullWidth error={showReasonError}>
          <InputLabel id="report-reason-label">Reason</InputLabel>
          <Select
            labelId="report-reason-label"
            id="report-reason-select"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (showReasonError && event.target.value) {
                setShowReasonError(false);
              }
            }}
            label="Reason"
            disabled={loading}
          >
            {REPORT_REASONS.map((reportReason) => (
              <MenuItem key={reportReason} value={reportReason}>
                {reportReason}
              </MenuItem>
            ))}
          </Select>
          {showReasonError && (
            <FormHelperText className={classes.helperText}>
              Please select a reason.
            </FormHelperText>
          )}
        </FormControl>

        <TextField
          className={classes.detailsField}
          id="report-details"
          label="Additional details (optional)"
          multiline
          rows={4}
          variant="outlined"
          fullWidth
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          disabled={loading}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="default" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit report"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportDialog;
