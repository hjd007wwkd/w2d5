var middlewareObj = {};

middlewareObj.checkCurrentUser = function(req, res, next){
  if(req.session.user_id === undefined){
    return res.redirect("/login")
  } else {
    next()
  }
}

middlewareObj.checkCurrentUserWError = function(req, res, next){
  if(req.session.user_id === undefined){
    return res.send("<a href=\"/login\">You have to login!!</a>")
  } else {
    next()
  }
}

module.exports = middlewareObj;
