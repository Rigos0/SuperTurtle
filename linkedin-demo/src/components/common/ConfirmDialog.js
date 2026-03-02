import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@material-ui/core";

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isPending = false,
  title = "Are you sure?",
  dialogId = "confirm-dialog-title",
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={dialogId}>
    <DialogTitle id={dialogId}>{title}</DialogTitle>
    <DialogContent dividers>
      <Typography variant="body2" color="textSecondary">
        {description}
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={isPending}>
        {cancelLabel}
      </Button>
      <Button onClick={onConfirm} variant="contained" color="secondary" disabled={isPending}>
        {isPending ? "Working..." : confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
