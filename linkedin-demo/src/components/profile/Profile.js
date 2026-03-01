import { Avatar, Button, Paper, Typography, Divider } from "@material-ui/core";
import LocationOnIcon from "@material-ui/icons/LocationOn";
import tadeasBibrAvatar from "../../assets/tadeas-bibr.jpg";
import useConvexUser from "../../hooks/useConvexUser";
import Style from "./Style";

const DEFAULT_PROFILE = {
  displayName: "Tadeáš Bíbr",
  photoURL: tadeasBibrAvatar,
  title: "📦 Co-Founder @ ReKrabice | Box Whisperer | Saving the planet one reusable package at a time",
  location: "Prague, Czech Republic 🇨🇿",
  about:
    "Serial box enthusiast. Co-founded ReKrabice because I saw a cardboard box in a dumpster and thought 'there has to be a better way.' Previously convinced the CEO of Slevomat that I was essential (still unconfirmed). When I'm not evangelizing reusable packaging, I'm probably at a Startup Night telling founders their MVP needs more boxes.",
  experience: [
    "📦 Co-Founder — ReKrabice (Reusable boxes that come back like boomerangs)",
    "📈 Business Development — Behavio (Reading people's minds, ethically)",
    "⚙️ EA to CEO — Slevomat (Professional calendar Tetris champion)",
  ],
  connections: 842,
  followers: 1337,
};

const resolveProfilePhoto = (photoURL) => {
  if (typeof photoURL === "string" && photoURL.startsWith("/")) {
    return tadeasBibrAvatar;
  }
  return photoURL;
};

const Profile = ({
  onBack,
  avatar = DEFAULT_PROFILE.photoURL,
  name = DEFAULT_PROFILE.displayName,
  title = DEFAULT_PROFILE.title,
}) => {
  const classes = Style();
  const featuredUser = useConvexUser();
  const userAvatar = resolveProfilePhoto(featuredUser?.photoURL) ?? avatar;
  const userName = featuredUser?.displayName ?? name;
  const userTitle = featuredUser?.title ?? title;
  const location = featuredUser?.location ?? DEFAULT_PROFILE.location;
  const connections = featuredUser?.connections ?? DEFAULT_PROFILE.connections;
  const followers = featuredUser?.followers ?? DEFAULT_PROFILE.followers;
  const about = featuredUser?.about ?? DEFAULT_PROFILE.about;
  const experience = featuredUser?.experience ?? DEFAULT_PROFILE.experience;

  return (
    <div className={classes.profile}>
      <Paper elevation={1} className={classes.card}>
        {/* Cover + avatar */}
        <div className={classes.coverArea}>
          <Avatar src={userAvatar} className={classes.avatar} />
        </div>

        {/* Identity */}
        <Typography variant="h6" className={classes.name}>
          {userName}
        </Typography>
        <Typography variant="body2" className={classes.title}>
          {userTitle}
        </Typography>

        {/* Meta */}
        <div className={classes.metaRow}>
          {location && (
            <Typography variant="body2" color="textSecondary" className={classes.metaItem}>
              <LocationOnIcon style={{ fontSize: 16, marginRight: 4 }} />
              {location}
            </Typography>
          )}
          <Typography variant="body2" style={{ color: "#0a66c2", fontSize: "0.8rem" }}>
            {connections} connections · {followers} followers
          </Typography>
        </div>

        {/* Action buttons */}
        <div className={classes.section} style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <Button
            variant="contained"
            size="small"
            style={{
              backgroundColor: "#0a66c2",
              color: "#fff",
              textTransform: "none",
              borderRadius: 16,
              fontWeight: 600,
              padding: "4px 16px",
            }}
          >
            Connect
          </Button>
          <Button
            variant="outlined"
            size="small"
            style={{
              textTransform: "none",
              borderRadius: 16,
              borderColor: "#0a66c2",
              color: "#0a66c2",
              fontWeight: 600,
              padding: "4px 16px",
            }}
          >
            Message
          </Button>
        </div>

        {/* About */}
        {about && (
          <div className={classes.section}>
            <Divider style={{ margin: "16px 0 12px" }} />
            <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 6 }}>
              About
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.65, whiteSpace: "pre-line" }}>
              {about}
            </Typography>
          </div>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <div className={classes.section}>
            <Divider style={{ margin: "16px 0 12px" }} />
            <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 6 }}>
              Experience
            </Typography>
            {experience.map((exp, i) => (
              <Typography key={i} variant="body2" color="textSecondary" style={{ marginBottom: 4, lineHeight: 1.55 }}>
                {exp}
              </Typography>
            ))}
          </div>
        )}

        {/* Back */}
        <div className={classes.section} style={{ marginTop: 20 }}>
          <Button
            variant="text"
            size="small"
            onClick={onBack}
            style={{ textTransform: "none", color: "#0a66c2", fontWeight: 600 }}
          >
            ← Back to feed
          </Button>
        </div>
      </Paper>
    </div>
  );
};

export default Profile;
