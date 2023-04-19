require('dotenv').config();
var md5 = require('md5');
const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const app = express();
const gravatar = require('gravatar');
const date = require("./date.js");
const UserDetails = require('./userschema.js');
const ProjectDetails = require('./projectschema.js');
const TicketDetails = require('./ticketSchema.js');
const TicketArchive = require('./ticketarchiveschema.js');
const isLoggedIn = require('./auth.js');
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
mongoose.set('strictQuery', false);
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(session({secret: 'keyboard cat', resave: false, saveUninitialized: true}));
const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(UserDetails.authenticate()));
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => {done(null, user._id);});
passport.deserializeUser((_id, done) => {
  UserDetails.findById( _id, (err, user) => {
    if(err){
        done(null, false, {error:err});
    } else {
        done(null, user);
    }
  });
});
////////////// connection to mongoDB Atlas using mongoose ///////////////////////////
const dbURI = 'mongodb+srv://Lex_x:Tofiluk143@projectmanagement.aexnu2c.mongodb.net/?retryWrites=true&w=majority';
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true,});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB Atlas')
});
////////////// connection to mongoDB Atlas using mongoose ///////////////////////////
app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err); // will generate a 500 error
    }
    // Generate a JSON response reflecting authentication status
    if (!user) {
      return res.status(401).send(
        {
          success: false,
          message: 'authentication failed'
        });
    }
    req.login(user, function(err) {
      if (err) {
        return next(err);
      }
      res.redirect("/main");
    });
  })(req, res, next);
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.post("/register", function(req, res) {
  UserDetails.register(new UserDetails({email: req.body.email, username: req.body.username}), req.body.password, function(err, user) {
    if (err) {
      res.json({success: false, message: "Your account could not be saved. Error: " + err});
    } else {
      const userType = req.body.userType;;
      if(userType === "user"){
        user.isUser = true;
        user.isAdmin = false;
      }else if(userType === "admin"){
        user.isUser = false;
        user.isAdmin = true;
      }
      user.save((saveError, updatedUser) => {
        req.login(updatedUser, loginError => {
          console.log(user);
          res.redirect("/login");
        });
      });
    }
  });
});

app.get("/main", isLoggedIn, getUsers, function(req, res) {
  ProjectDetails.find({}, function(err, posts) {
    res.render('main', {posts: posts, adminUser: req.user.isAdmin, currentUser: req.user.username});
  });
});

app.post("/main", function(req, res) {
  const post = new ProjectDetails({title: req.body.postTitle, content: req.body.postBody});
  post.save();
  res.redirect("/main");
});

app.get("/about", isLoggedIn, function(req, res) {
  const currentUser = req.user.username;
  TicketDetails.find({ assignedTo: currentUser }, function(err, items) {
    if (err) {
      console.log(err);
    } else {
      const day = date.getDate();
      res.render("about", {listTitle: day, items: items, currentScore: req.user.score});
    }
  });
});

app.post("/delete", function(req, res){
  const checkedItemID = req.body.checkbox; // item being sent from form
  const urgency = req.body.urgency;
  TicketDetails.findByIdAndDelete(checkedItemID, function (err, docs) {
      if (err){
          console.log(err)
      }
      else{
          console.log("Deleted : ", docs);
      }
  });
  if(urgency === "minor"){
    UserDetails.findOneAndUpdate({ username: req.user.username }, { $inc: { score: 1 } }, { new: true }, function(err, updatedItem) {
      if (err) {
        console.log(err);
      } else {
        console.log(updatedItem);
        res.redirect("/about");
      }
    });
  }
  if(urgency === "medium"){
    UserDetails.findOneAndUpdate({ username: req.user.username }, { $inc: { score: 2 } }, { new: true }, function(err, updatedItem) {
      if (err) {
        console.log(err);
      } else {
        console.log(updatedItem);
        res.redirect("/about");
      }
    });
  }
  if(urgency === "major"){
    UserDetails.findOneAndUpdate({ username: req.user.username }, { $inc: { score: 3 } }, { new: true }, function(err, updatedItem) {
      if (err) {
        console.log(err);
      } else {
        console.log(updatedItem);
        res.redirect("/about");
      }
    });
  }
});

function getUsers(req, res, next) {
  UserDetails.find({}, function(err, users) {
    if (err) next(err);
    res.locals.savedUsers = users;
    next();
  });
};
function getProjects(req, res, next) {
  ProjectDetails.find({}, function(err, projects) {
    if (err) next(err);
    res.locals.savedProjects = projects;
    next();
  });
};
function renderForm(req, res) {
  const userIsUserType = req.user.isUser;
  res.render("compose", {isUser: userIsUserType});
};
app.get("/compose", isLoggedIn, getUsers, getProjects, renderForm);

app.post("/compose", function(req, res) {
  const newTicket = new TicketDetails({title: req.body.ticketTitle, description: req.body.ticketBody, project: req.body.project, assignedTo: req.body.assignedTo, assignedBy: req.user.username, urgency: req.body.ticketUrgency});
  const ticketArchive = new TicketArchive({title: req.body.ticketTitle, description: req.body.ticketBody, project: req.body.project, assignedTo: req.body.assignedTo, assignedBy: req.user.username, urgency: req.body.ticketUrgency});
  newTicket.save();
  ticketArchive.save();
  console.log(newTicket);
  res.redirect("/about");
});

app.get("/posts/:postId", isLoggedIn, function(req, res) {
  const requestedPostId = req.params.postId;
  ProjectDetails.findOne({_id: requestedPostId}, function(err, post) {
    res.render("post", {title: post.title, content: post.content});
  });
});

app.get('/delete/:postid', isLoggedIn, function(req, res) {
  const postId = req.params.postid;
  ProjectDetails.findByIdAndDelete(postId, function (err, docs) {
      if (err){
          console.log(err)
      }
      else{
          console.log("Deleted : ", docs);
      }
  });
  res.redirect("/main");
});

app.get("/logout", function(req, res, next) {
  req.logout(function(err) {
    if (err) {return next(err);}
    res.redirect("/");
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
