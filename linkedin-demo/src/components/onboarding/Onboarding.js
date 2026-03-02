import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Button, CircularProgress, Paper, TextField, Typography } from "@material-ui/core";
import { api } from "../../convex/_generated/api";
import Style from "./Style";

const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugifyUsername = (value) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "user";
};

const Onboarding = ({ currentUser }) => {
  const classes = Style();
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hasEditedUsername, setHasEditedUsername] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const initialDisplayName = (currentUser?.displayName ?? currentUser?.name ?? "").trim();
    setDisplayName(initialDisplayName);
    setTitle((currentUser?.title ?? "").trim());
    setLocation((currentUser?.location ?? "").trim());
    setUsername(slugifyUsername(initialDisplayName || "user"));
    setHasEditedUsername(false);
  }, [currentUser?._id, currentUser?.displayName, currentUser?.name, currentUser?.title, currentUser?.location]);

  const normalizedUsername = useMemo(() => username.trim().toLowerCase(), [username]);
  const usernameIsValid = USERNAME_REGEX.test(normalizedUsername);
  const displayNameIsValid = displayName.trim().length > 0;

  const shouldCheckAvailability = normalizedUsername.length > 0 && usernameIsValid;
  const isUsernameAvailable = useQuery(
    api.users.isUsernameAvailable,
    shouldCheckAvailability ? { username: normalizedUsername } : "skip",
  );

  const usernameIsAvailable = usernameIsValid && isUsernameAvailable === true;
  const canSubmit = displayNameIsValid && usernameIsAvailable && !isSaving;

  let usernameHelper = "Use lowercase letters, numbers, and hyphens only.";
  let usernameHelperClass = classes.helperNeutral;

  if (!normalizedUsername) {
    usernameHelper = "Pick a unique profile URL username.";
  } else if (!usernameIsValid) {
    usernameHelper = "Invalid format. Example: alex-turner";
    usernameHelperClass = classes.helperError;
  } else if (isUsernameAvailable === undefined) {
    usernameHelper = "Checking availability...";
  } else if (!isUsernameAvailable) {
    usernameHelper = "This username is already taken.";
    usernameHelperClass = classes.helperError;
  } else {
    usernameHelper = "Username is available.";
    usernameHelperClass = classes.helperSuccess;
  }

  const handleDisplayNameChange = (event) => {
    const nextDisplayName = event.target.value;
    setDisplayName(nextDisplayName);

    if (!hasEditedUsername) {
      setUsername(slugifyUsername(nextDisplayName || "user"));
    }
  };

  const handleUsernameChange = (event) => {
    setHasEditedUsername(true);
    setUsername(event.target.value);
  };

  const [isSkipping, setIsSkipping] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsSaving(true);
    setSaveError("");

    try {
      await completeOnboarding({
        username: normalizedUsername,
        displayName: displayName.trim(),
        title: title.trim(),
        location: location.trim(),
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    setSaveError("");

    const fallbackName = (currentUser?.displayName ?? currentUser?.name ?? currentUser?.email ?? "user").trim();
    const autoUsername = slugifyUsername(fallbackName) || `user-${Date.now().toString(36)}`;

    try {
      await completeOnboarding({
        username: autoUsername,
        displayName: fallbackName || "TurtleIn User",
        title: "",
        location: "",
      });
    } catch (error) {
      // If auto-generated username is taken, append random suffix and retry
      try {
        await completeOnboarding({
          username: `${autoUsername}-${Date.now().toString(36)}`,
          displayName: fallbackName || "TurtleIn User",
          title: "",
          location: "",
        });
      } catch (retryError) {
        setSaveError(retryError instanceof Error ? retryError.message : "Unable to skip setup");
      }
    } finally {
      setIsSkipping(false);
    }
  };

  return (
    <div className={classes.container}>
      <Paper elevation={3} className={classes.card}>
        <Typography variant="h5" className={classes.title}>
          Complete your profile
        </Typography>
        <Typography variant="body2" className={classes.subtitle}>
          Choose a username and add your basic info to finish setting up TurtleIn.
        </Typography>

        <form className={classes.form} onSubmit={handleSubmit}>
          <TextField
            label="Username"
            variant="outlined"
            size="small"
            value={username}
            onChange={handleUsernameChange}
            required
            autoFocus
            inputProps={{
              autoCapitalize: "none",
              autoCorrect: "off",
              spellCheck: false,
            }}
            error={Boolean(normalizedUsername) && (!usernameIsValid || isUsernameAvailable === false)}
          />
          <Typography className={`${classes.helper} ${usernameHelperClass}`}>{usernameHelper}</Typography>

          <TextField
            label="Display name"
            variant="outlined"
            size="small"
            value={displayName}
            onChange={handleDisplayNameChange}
            required
            error={!displayNameIsValid && displayName.length > 0}
          />

          <TextField
            label="Title"
            variant="outlined"
            size="small"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          <TextField
            label="Location"
            variant="outlined"
            size="small"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />

          <div className={classes.actions}>
            <Button
              onClick={handleSkip}
              disabled={isSaving || isSkipping}
              className={classes.skipButton}
            >
              {isSkipping ? (
                <span className={classes.submitLabel}>
                  <CircularProgress size={16} color="inherit" thickness={5} />
                  Skipping...
                </span>
              ) : (
                "Skip for now"
              )}
            </Button>
            <Button type="submit" disabled={!canSubmit} className={classes.submitButton}>
              {isSaving ? (
                <span className={classes.submitLabel}>
                  <CircularProgress size={16} color="inherit" thickness={5} />
                  Saving...
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </div>

          {saveError ? <Typography className={classes.footerError}>{saveError}</Typography> : null}
        </form>
      </Paper>
    </div>
  );
};

export default Onboarding;
