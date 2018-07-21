/**
 * NUMERAL - user
 * (c) 2017
 */

'use strict';

var mongoose = require('mongoose');
var express = require('express');
var router = express.Router();

var User = mongoose.model('User', require('../models/user.js'));
var config = require('../config.json'); // Config
var environment = config[process.env.NODE_ENV || 'development']; // Environment

var Helpers = require("../tools/helpers.js");
var Prepare = require("../tools/prepare.js");
var ensureAuthenticated = Helpers.ensureAuthenticated;
var log = Helpers.log;

var nodemailer = require('nodemailer');
var async = require('async');
var crypto = require('crypto');

/*
 |--------------------------------------------------------------------------
 | GET /user/me
 |--------------------------------------------------------------------------
 */
router.get('/me', ensureAuthenticated, function (req, res) {

    var endPoint = '/user/me';
    var method = 'GET';

    User.findById(req.user).exec(function (err, user) {

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

        if (!user)
            return log({message: 'User not found'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

        req.user = user;

        // Required to persist data
        var tempUser = JSON.parse(JSON.stringify(user));

        Prepare.users([user], function(err, users) {

            if (err)
                return log({message: err.message}, {'status': err.status, method: method, endPoint: endPoint}, req, res);

            // No need to strip sensitive for self
            users[0]['email'] = tempUser.email;
            users[0]['password'] = tempUser.password;

            return log({user: users[0]}, {'status': 200, method: method, endPoint: endPoint}, req, res);
        });
    });
});

/*
 |--------------------------------------------------------------------------
 | PUT /user/me
 |--------------------------------------------------------------------------
 */
router.put('/me', ensureAuthenticated, function (req, res) {

    var endPoint = '/user/me';
    var method = 'PUT';

    User.findById(req.user, function (err, user) {

        if (!user)
            return log({message: 'User not found'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

        req.user = user;

        // TODO: Type checks

        user.name = req.body.name || user.name;

        user.save(function (err) {

            if (err)
                return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

            return log({user : user}, {'status': 200, method : method, endPoint: endPoint}, req, res);
        });

    });

});

/*
 |--------------------------------------------------------------------------
 | GET /user/:userId
 |--------------------------------------------------------------------------
 */
router.get('/:userId', function (req, res) {

    var endPoint = '/user/:userId';
    var method = 'GET';

    if (!mongoose.Types.ObjectId.isValid(req.params.userId))
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    User.findOne({_id : req.params.userId}).exec(function(err, user){

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

        if (!user)
            return log({message: 'User not found'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

        Prepare.users([user], function(err, users) {

            if (err)
                return log({message: err.message}, {'status': err.status, method: method, endPoint: endPoint}, req, res);

            return log({user: users[0]}, {'status': 200, method: method, endPoint: endPoint}, req, res);
        });

    });
});

/*
 |--------------------------------------------------------------------------
 | POST /user/query
 |--------------------------------------------------------------------------
 */
router.post('/query', ensureAuthenticated, function (req, res) {

    var endPoint = '/user/query';
    var method = 'POST';

    // TODO: Pagination, Coordinates (prioritize closer)

    if (typeof req.body.term === 'undefined')
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    User.findById(req.user, function (err, user) {

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

        if (!user)
            return log({message: 'User not found'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

        req.user = user;

        User.find({
            $or : [
                {name : {$regex : req.body.term, $options : 'i'}},
                {email : {$regex : req.body.term, $options : 'i'}}
                ]
        }).sort('-createdAt').exec(function (err, users) {

            if (err)
                return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

            Prepare.users(users, function(err, users) {

                if (err)
                    return log({message: err.message}, {'status': err.status, method: method, endPoint: endPoint}, req, res);

                return log({users: users}, {'status': 200, method: method, endPoint: endPoint}, req, res);
            });

        });
    });

});

/*
 |--------------------------------------------------------------------------
 | POST /user/password-forgot
 |--------------------------------------------------------------------------
 */
router.post('/password-forgot', function(req, res) {

    var endPoint = '/password-forgot';
    var method = 'POST';

    if (typeof req.body.email === 'undefined')
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {

                if (err)
                    return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {

            User.findOne({email: req.body.email}, function(err,user) {

                if (!user)
                    return log({message: 'No account with that email address'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

                if (err)
                    return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000;

                user.save(function(err){

                    if (err)
                        return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

                    req.user = user;

                    done(err, token);
                })
            })
        },
        function(token) {

            var email = req.body.email;

            // var transporter = nodemailer.createTransport({
            //     service: "Gmail",
            //     auth: {
            //         user: config.google.mail.email,
            //         pass: config.google.mail.password
            //     }
            // });

            var html = "Hello " + (req.user.name || '') + "!"
                + "<br><br>"
                + "You have requested to reset your password with the email: " + email + "<br><br>"
                + "<a href='" + environment.hostname + '/reset-password/' + token + "'>" + "Click to Reset Password" + "</a>"
                + "<br><br>"
                + "If you did not request to reset your password, please disregard this email.<br><br>"
                + "- TastePal";

            console.log(html)

            var mailOptions = {
                to: email,
                subject: 'Password Reset Confirmation ✔',
                html: html
            };

            // transporter.sendMail(mailOptions, function(err){
            //
            //     if (err)
            //         return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);
            //
            //     return log({success: true}, {'status': 200, method: method, endPoint: endPoint}, req, res);
            // });

        }
    ], function(err) {

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

    });

});

/*
 |--------------------------------------------------------------------------
 | POST /user/reset-password/:token
 |--------------------------------------------------------------------------
 */
router.post('/reset-password/:token', function (req, res) {

    var endPoint = '/reset-password';
    var method = 'POST';

    async.waterfall([
        function(done) {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() }}, function(err, user){

                if (!user)
                    return log({message: 'Password reset token is invalid or has expired'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

                if (err)
                    return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

                user.password = req.body.password;
                user.resetPasswordToken = undefined;
                user.resetPasswordExpires = undefined;

                user.save(function(err) {

                    if (err)
                        return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

                    done(err,user);

                });
            })

        },
        function(user) {

            // var transporter = nodemailer.createTransport({
            //     service: "Gmail",
            //     auth : {
            //         user : config.google.mail.email,
            //         pass: config.google.mail.password
            //     }
            // });

            var html = "Hello " + (user.name || '') + ",<br><br>"
                + "This is a confirmation that the password for your account has just been changed.<br>";

            console.log(html)

            var mailOptions = {
                to: user.email,
                subject: 'Password Reset Successful ✔',
                html: html
            };

            // transporter.sendMail(mailOptions, function(err, info) {
            //
            //     if (err)
            //         return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);
            //
            //     return log({success: true}, {'status': 200, method: method, endPoint: endPoint}, req, res);
            //
            // });

        }
    ], function(err) {

        return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

    });

});

module.exports = router;

// EOF
