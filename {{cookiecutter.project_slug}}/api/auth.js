/**
 * NUMERAL - auth
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
var createJWT = Helpers.createJWT;


/*
 |--------------------------------------------------------------------------
 | POST /auth/email/signup
 |--------------------------------------------------------------------------
 */
router.post('/email/signup', function(req, res) {

    var endPoint = '/auth/email/signup';
    var method = 'POST';

    if ((typeof req.body.email === 'undefined') || (typeof req.body.nickname === 'undefined') || (typeof req.body.name === 'undefined') || (typeof req.body.password === 'undefined'))
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    req.body.email = req.body.email.toLowerCase();

    // TODO: Can be parallelized

    User.findOne({email: req.body.email}, function (err, existingUser) {

        if (existingUser)
            return log({message: 'Email is already taken'}, {'status': 409, method : method, endPoint: endPoint}, req, res);

        User.findOne({nickname: req.body.nickname}, function (err, existingUser) {

            if (existingUser)
                return log({message: 'User name is already taken'}, {'status': 409, method: method, endPoint: endPoint}, req, res);

            var user = new User({
                email: req.body.email,
                name: req.body.name,
                nickname: req.body.nickname,
                password: req.body.password,
                type: 'default'
            });

            user.save(function (err, user) {

                if (err)
                    return log(err, {'status': 500, method: method, endPoint: endPoint}, req, res);

                return log({token: createJWT(user)}, {'status': 200, method: method, endPoint: endPoint}, req, res);

            });

        });

    });
});

/*
 |--------------------------------------------------------------------------
 | POST /auth/email/login
 |--------------------------------------------------------------------------
 */
router.post('/email/login', function (req, res) {

    var endPoint = '/auth/email/login';
    var method = 'POST';

    if ((typeof req.body.email === 'undefined') && (typeof req.body.nickname === 'undefined'))
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    var options;

    if (req.body.email)
        options = {
            email : req.body.email.toLowerCase()
        };
    else
        options = {
            nickname : req.body.nickname
        };

    User.findOne(options, '+password', function (err, user) {

        if (!user)
            return log({message: 'Invalid Email and/or Password'}, {'status': 401, method : method, endPoint: endPoint}, req, res);

        if (err)
            return log(err, {'status': 500, method : method, endPoint: endPoint}, req, res);

        user.comparePassword(req.body.password, function(err, isMatch) {

            if (!isMatch)
                return log({message: 'Invalid Email/Username and/or Password'}, {'status': 401, method : method, endPoint: endPoint}, req, res);

            return log({token : createJWT(user)}, {'status': 200, method : method, endPoint: endPoint}, req, res);

        });
    });
});

/*
 |--------------------------------------------------------------------------
 | POST /auth/check/email
 |--------------------------------------------------------------------------
 */
router.post('/check/email', function(req, res) {

    var endPoint = '/auth/check/email';
    var method = 'POST';

    if (typeof req.body.email === 'undefined')
        return log({message: 'Invalid parameters'}, {'status': 400, method : method, endPoint: endPoint}, req, res);

    User.findOne({email: {$regex: '^' + req.body.email + '$', $options: 'i'}}, function (err, existingUser) {

        if (existingUser)
            return log({message: 'User email is already taken'}, {'status': 409, method: method, endPoint: endPoint}, req, res);

        if (err)
            return log(err, {'status': 500, method: method, endPoint: endPoint}, req, res);

        return log({success: true}, {'status': 200, method: method, endPoint: endPoint}, req, res);

    });
});


module.exports = router;

// EOF
