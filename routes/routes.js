"use strict";

var User = require('../models/user');


// AWS Configs
var AWS_ACCESS_KEY = '********************';
var AWS_SECRET_KEY = '*******************';
var S3_BUCKET = 'gymbuddies-bucket';

module.exports = function ( app, passport, aws ) {
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
  app.post('/login', passport.authenticate('local-login',
      { failureRedirect: '/notauthorized'}),
      function (req, res) {
        res.json(req.user);
      });

  /**
   * This response is sent when the user is not authenticated
   */
  app.get('/notauthorized', function (req, res) {
    res.json(403, {message: 'Invalid user.'});
  });

  /**
   * Route the register request to passport signup
   */
  app.post('/user/register', passport.authenticate('local-signup',
    { failureRedirect: '/user/register' }),
    function ( req, res ) {
        res.json(req.user);
    }
  );

  /**
  * Get a list of users for the communities page
  */
  app.get('/communities/users', function ( req, res ) {
    // Get the user email from request body
    var email = req.param('email');
    var usr = User.findOne({'local.auth.email': email}, function (err, user) {
        if ( err )
            res.json(403, {message: 'Not authorized to access the feature.'});

        if ( user ) {
            User.find({'_id': { $ne: user._id },
                'local.objectives': { $in: user.local.objectives }})
                .exec(function (err, users) {
                res.json(users);
            });
        }
    });
  });

  /**
  * Get user by email
  * @param email    Email of the resulting user
  */
  app.get('/user', function ( req, res ) {
      var email = req.param('email');
      User.findOne({ 'local.auth.email': email }, function (err, user) {
          if (err)
            res.json(404, {message: "User not found."});

          res.send(user);
      });
  });

  /**
  * Endpoint to allow edit user information
  * @param email    update the information for user with this email
  */
  app.post('/user/edit', function ( req, res ) {
     var email = req.param('email');
     var objectives = req.param('goals');
     if ( objectives ) {
         objectives = objectives.trim().split(/\s*,\s*/);
     }
     // Get the user
     User.findOne({'local.auth.email': email}, function (err, usr) {
         usr.local.first_name = req.param('firstName') || usr.local.first_name;
         usr.local.last_name = req.param('lastName') || usr.local.last_name;
         usr.local.age = req.param('age') || usr.local.age;
         usr.local.phone_num = req.param('phone_num') || usr.local.phone_num;
         usr.local.weight = req.param('weight') || usr.local.weight;
         usr.local.body_fat = req.param('body_fat') || usr.local.body_fat;
         usr.local.bio = req.param('bio') || usr.local.bio;
         if (objectives) {
             usr.local.objectives = objectives;
         }
         usr.save(function (err) {
             res.send(usr);
         });
     });
  });

  /**
  * Check if two given users are a match
  */
  app.get('/user/ismatch', function(req, res) {
      var userEmail = req.param('email');
      var matchEmail = req.param('matchEmail');

      var matchPromise = User.findOne({'local.auth.email': matchEmail}).exec();

      matchPromise.then(function (matchUsr) {
          User.findOne({'local.auth.email': userEmail,
          '_id': {$in : matchUsr.local.matches}}).exec(function (err, usr) {

            if ( usr ) {
                res.json(200, {message: 'Match Found!'});
            } else {
                res.json(304, {message: 'Match Not Found'});
            }

          });
      });
  });

  /**
  * Matching for users
  * @param email, matchEmail       Match matchEmail to email
  */
  app.post('/user/match', function ( req, res ) {
      var userEmail = req.param('email');
      var matchEmail = req.param('matchEmail');

      var matchPromise = User.findOne({ 'local.auth.email': matchEmail }).exec();
      var userPromise = User.findOne({ 'local.auth.email': userEmail }).exec();

      // Handle promises to assign the match to the user
      matchPromise.then(function (matchUsr) {
          User.update({ 'local.auth.email': userEmail },
                        { $addToSet: { 'local.matches': matchUsr } },
                        function (err, updated) {
                            res.json(200, {message: 'Invalid user.'});
                        });
      });

  });

  /**
  * Get a list users to whome the current user is matched as
  * @param email    Email is the email of current user
  */
  app.get('/user/matches', function ( req, res ) {
      var email = req.param('email');

      var matchesPromise = User.findOne({ 'local.auth.email': email })
                                .populate('local.matches')
                                .exec();

      // Return the auto populated matches
      matchesPromise.then(function (user) {
          res.send(user.local.matches);
      });

  });

  /**
  * Handles signing for the S3 uploads
  */
  app.get('/sign', function ( req, res ) {
    aws.config.update({accessKeyId: AWS_ACCESS_KEY, secretAccessKey: AWS_SECRET_KEY});

    var s3 = new aws.S3();
    var options = {
      Bucker: S3_BUCKET,
      Key: req.query.file_name,
      Expires: 60,
      ContentType: req.query.file_type,
      ACL: 'public-read'
    }

    s3.getSignedUrl('putObject', options, function ( err, data ) {
      if ( err ) return res.send('Error with S3');

      res.json({
        signed_request: data,
        url: 'https://s3.amazonaws.com/' + S3_BUCKET + '/' + req.query.file_name
      });
    });
   });
}
