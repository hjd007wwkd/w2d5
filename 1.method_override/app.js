const express = require("express");
const app = express();
const methodOverride = require("method-override")
const PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const bcrypt = require('bcrypt');
const cookieSession = require('cookie-session');
const middleware = require("./middleware/middleware.js");

app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(cookieSession({
  name: 'session',
  keys: ["secret"]
}));

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": {
    short_URL: "b2xVn2",
    long_URL: "http://www.lighthouselabs.ca",
    user_id: "userRandomID",
    date: "12/01/2015",
    visits: 0,
    unique_visits: [],
    visitors_list: []
  },
  "9sm5xK": {
    short_URL: "9sm5xK",
    long_URL: "http://www.google.com",
    user_id: "userRandomID",
    date: "12/05/2016",
    visits: 0,
    unique_visits: [],
    visitors_list: []
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
};

function generateRandomString() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function generateTimestamp() {
  let currentDate = new Date();
  let date = currentDate.getDate();
  let month = currentDate.getMonth();
  let year = currentDate.getFullYear();
  var hours = currentDate.getHours() < 10 ? "0" + currentDate.getHours() : currentDate.getHours();
  var minutes = currentDate.getMinutes() < 10 ? "0" + currentDate.getMinutes() : currentDate.getMinutes();
  var seconds = currentDate.getSeconds() < 10 ? "0" + currentDate.getSeconds() : currentDate.getSeconds();
  return (month + 1) + "/" + date + "/" + year + " - " + hours + ":" + minutes + ":" + seconds;
}

app.get("/", middleware.checkCurrentUser, function(req, res){
  res.redirect("/urls");
});

app.get("/urls", middleware.checkCurrentUserWError, function(req, res){
  let currentUserId = req.session.user_id;
  let templateVars = { user: users[currentUserId], urls: urlDatabase };
  res.render("urls_index", templateVars);
});

//the page for adding a new URL
app.get("/urls/new", middleware.checkCurrentUser,function(req, res){
  let currentUserId = req.session.user_id;
  let templateVars = { user: users[currentUserId] };
  res.render("urls_new", templateVars);
});

//add new URL data to database object
app.post("/urls", middleware.checkCurrentUserWError, function(req, res){
  let dateString = generateTimestamp();
  let randomString = generateRandomString();
  urlDatabase[randomString] = {short_URL: randomString, long_URL: req.body.longURL, user_id: req.session.user_id, date: dateString, visits: 0, unique_visits: [], visitors_list: []};
  res.redirect("/urls");
});

//edit page for each URL
app.get("/urls/:id", middleware.checkCurrentUserWError, function(req, res){
  //if you haven't login
  //if the id does not exist in database
  //if the url is not made by current user
  //send a error message
  if (urlDatabase[req.params.id] === undefined){
    res.send("<h2>No page Found</h2>");
  } else if (req.session.user_id !== urlDatabase[req.params.id].user_id){
    res.send("<h2>You are not authorized!!</h2>");
  } else {
    const currentUserId = req.session.user_id;
    let templateVars = { user: users[currentUserId], shortURL: req.params.id, urlDatabase: urlDatabase};
    res.render("urls_show", templateVars);
  }
});

//set the updated URL
app.put("/urls/:id", middleware.checkCurrentUserWError, function(req, res){
  if (req.session.user_id !== urlDatabase[req.params.id].user_id){
    return res.send("<h2>You are not authorized!!</h2>");
  }
  let newLongURL = req.body.updatedURL;
  urlDatabase[req.params.id].long_URL = newLongURL;
  res.redirect("/urls");
})

//get into the URL with the shortURL
app.get("/u/:shortURL", function(req, res){
  if (urlDatabase[req.params.shortURL] === undefined){
    return res.send("<h2>No page Found</h2>");
  }

  //if there is no visit id, set one
  //but if there is login id, set the visit id as login id
  const uniqueVisits = urlDatabase[req.params.shortURL].unique_visits;
  if(req.session.user_id === undefined && req.session.visit_id === undefined){
    req.session.visit_id = generateRandomString();
  } else if(req.session.user_id !== undefined) {
    req.session.visit_id = req.session.user_id;
  }

  //see if the one who has the visit_id visit the site
  if(!uniqueVisits.includes(req.session.visit_id)){
    urlDatabase[req.params.shortURL].unique_visits.push(req.session.visit_id);
  }

  urlDatabase[req.params.shortURL].visitors_list.push(req.session.visit_id + " - " + generateTimestamp())
  urlDatabase[req.params.shortURL].visits++;
  let longURL = urlDatabase[req.params.shortURL].long_URL;
  res.redirect(longURL);
});

//delete the URL by owner
app.delete("/urls/:id", middleware.checkCurrentUserWError, function(req, res){
  if(req.session.user_id !== urlDatabase[req.params.id].user_id){
    res.send("<h2>You are not authorized to delete this URL</h2>");
  }
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
})

app.get("/login", function(req, res){
  if(req.session.user_id !== undefined){
    return res.redirect("/urls");
  }
  res.render("urls_login");
})

app.post("/login", function(req, res){
  let email = req.body.email;
  let password = req.body.password;
  for(let user in users){
    //check if matching information with users database
    if(users[user].email === email && bcrypt.compareSync(password, users[user].password)){
      req.session.user_id = user;
      return res.redirect("/urls");
    };
  };
  //if not found, send error message to users
  res.send("<h2>403 status code, email or password is wrong</h2>");
});

app.get("/register", function(req, res){
  if(req.session.user_id !== undefined){
    return res.redirect("/urls");
  };
  res.render("urls_register");
});

app.post("/register", function(req, res){
  //check if there is same email in the database
  for(let user in users){
    if(users[user].email === req.body.email){
      return res.send("400 status code, existing email");
    };
  };
  //cannot be empty value for both
  if(req.body.email === "" || req.body.password === ""){
    return res.send("400 status code, email or password cannot be empty");
  };
  let userId = generateRandomString();
  let passwordEnc = bcrypt.hashSync(req.body.password, 10);
  users[userId] = {id: userId, email: req.body.email, password: passwordEnc};
  req.session.user_id = userId;
  res.redirect("/urls");
});

app.post("/logout", function(req, res){
  req.session = null;
  res.redirect("/urls");
});

app.get("/urls.json", function(req, res) {
  res.json(urlDatabase);
});

app.get("/hello", function(req, res){
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});


app.listen(PORT, function(){
  console.log(`Example app listening on port ${PORT}!`);
});