/**
 * NUMERAL - /tools/prepare
 * (c) 2018
 */

var mongoose = require('mongoose');
var jwt = require('jwt-simple');
var _ = require('underscore');

var User = mongoose.model('User', require('../models/user.js'));

var config = require('../tools/config.json'); // Config
var environment = config[process.env.NODE_ENV || 'development']; // Environment

var Helpers = require("../tools/helpers.js");
var createJWT = Helpers.createJWT;

Prepare = {

    /*
     |--------------------------------------------------------------------------
     | Prepare user objects
     |--------------------------------------------------------------------------
     */
    users: function(users, callback) {

        var users = _.filter(users, function (user) {

            if (!user)
                return false;

            // Strip sensitive information
            user.password = undefined;

            return true;

        });

        return callback(null, users);
    },

};

function letterValue(str) {

    // Retrieved from https://stackoverflow.com/questions/22624379/how-to-convert-letters-to-numbers-with-javascript

    var anum = {
        a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9, j: 10, k: 11,
        l: 12, m: 13, n: 14,o: 15, p: 16, q: 17, r: 18, s: 19, t: 20,
        u: 21, v: 22, w: 23, x: 24, y: 25, z: 26
    };

    if (str.length === 1)
        return anum[str] || ' ';

    return str.split('').map(letterValue);
}

module.exports = Prepare;

// EOF
