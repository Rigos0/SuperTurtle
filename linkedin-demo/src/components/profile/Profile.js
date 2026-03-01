import { Avatar, Button, Paper, Typography } from "@material-ui/core";
import { mockUser } from "../../mock/user";
import Style from "./Style";

const Profile = ({
  onBack,
  avatar = mockUser.photoURL,
  name = mockUser.displayName,
  title = mockUser.title,
}) => {
  const classes = Style();

  return (
    <div className={classes.profile}>
      <Paper elevation={1} className={classes.card}>
        <Avatar src={avatar} className={classes.avatar} />
        <Typography variant="h5" className={classes.name}>
          {name}
        </Typography>
        <Typography variant="body1" className={classes.title}>
          {title}
        </Typography>
        <Button variant="outlined" color="primary" onClick={onBack}>
          Back to feed
        </Button>
      </Paper>
    </div>
  );
};

export default Profile;
