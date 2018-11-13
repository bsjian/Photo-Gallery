const express        = require("express"),
      app            = express(),
      bodyParser     = require("body-parser"),
      mongoose       = require("mongoose"),
      helmet         = require("helmet"),
      flash          = require("connect-flash"),
      session        = require("express-session"),
      moment         = require("moment"),
      passport       = require("passport"),
      LocalStrategy  = require("passport-local"),
      methodOverride = require("method-override"),
      User           = require("./models/user");

// requiring routes     
const indexRoute      = require("./routes/index"),
      photoRoute = require("./routes/photos"),
      commentRoute    = require("./routes/comments"),
      userRoute       = require("./routes/user"),
      passwordRoute   = require("./routes/password");





var url = "mongodb://basil:123456a@ds031183.mlab.com:31183/photo_gallery";
//set the local dburl to undefined, on heroku, set it to be the link
// export DATABASEURL=mongodb://basil:123456a@ds031183.mlab.com:31183/photo_gallery 
// mongoose.connect("mongodb://localhost:27017/yelp_camp",{ useNewUrlParser: true });
mongoose.connect(url,{ useNewUrlParser: true });

// connect to the DB
// let url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp_v13"; // fallback in case global var not working
// mongoose.connect(url, {useMongoClient: true});

process.env['SESSIONSECRET'] = 1
process.env['APISECRET'] = "fqF6YmicO9bjwSyKu4Awa9PYz3Q"
process.env['ADMINCODE'] = 'asd67890'
process.env['GOOGLEMAPSAPI'] = 'AIzaSyDBcONMAuzfwgOybANRISmmHgYalCNz3AM'
app.set("view engine", "ejs");
app.use(helmet());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.locals.moment = moment; // create local variable available for the application

//passport configuration
app.use(session({
  secret: process.env.SESSIONSECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// pass currentUser to all routes
app.use((req, res, next) => {
  res.locals.currentUser = req.user; // req.user is an authenticated user
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// use routes
app.use("/", indexRoute);
app.use("/photos", photoRoute);
app.use("/photos/:id/comments", commentRoute);
app.use("/users", userRoute);
app.use("/", passwordRoute);

app.listen(process.env.PORT, process.env.IP, () => console.log("The YelpCamp Server Has Started!"));
