/**
 * NUMERAL - /models/user
 * (c) 2017
 */

var mongoose = require('mongoose');
var db = require('../api/db.js');
var bcrypt = require('bcryptjs');


var userSchema = new mongoose.Schema({
    createdAt: {type: Date},
    updatedAt: {type: Date},
    email: {type: String, unique: true, lowercase: true},
    name: {type: String},
    password: {type: String, select: false},
    resetPasswordToken: {type: String},
    resetPasswordExpires: {type: Date}
});

userSchema.pre('save', function (next) {

    var user = this;

    // Middleware

    user.updatedAt = new Date().getTime();
    if (!user.createdAt)
        user.createdAt = user.updatedAt;

    if (!user.isModified('password'))
        return next();
    bcrypt.hash(user.password, 10, function(err, hash) {
        user.password = hash;
        next();
    });

});

userSchema.methods.comparePassword = function(password, done) {
    bcrypt.compare(password, this.password, function(err, isMatch) {
        done(err, isMatch);
    });
};

var User = db.model('User', userSchema);

module.exports = User;

// EOF
