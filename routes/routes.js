"use strict";
module.exports = function ( app, passport ) {
  /**
   * Handle Cors requests
   */
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Header", "Origin, X-Requested-With, " + 
        "Content-Type, Accept");
    next();
  });

  app.get('/', function (req, res) {
    res.send("Welcome to GymBuddy API");
  });

  /**
   * Route the login request to passport local login
   */
  app.post('/login', passport.authenticate('local-login', { failureRedirect: '/'}),
      function (req, res) {
        console.log(req.user);
        res.json(req.user);
      });

  /**
   * Route the register request to passport signup
   */
  app.post('/register', passport.authenticate('local-signup', {
    successRedirect: '/',
    failureRedirect: '/register'
  }));

}