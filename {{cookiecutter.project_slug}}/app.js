
'use strict';

var bodyParser = require('body-parser');
const express = require('express');
var config = require('./config.json'); // Config
var environment = config[process.env.NODE_ENV || 'development']; // Environment

// Routes
var auth = require('./api/auth.js');
var user = require('./api/user.js');

const app = express();


app.set('port', environment.port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static('views'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Map endpoints
app.use('/api/user', user);
app.use('/api/auth', auth);


// Password Reset Render View
app.get('/reset-password/:token', function(req, res) {
    res.render('passwordreset.ejs');
});


app.listen(app.get('port'), function() {
    console.log('{{cookiecutter.project_slug}} listening on port ' + app.get('port'));
}).on('error', function (err) {
    console.log(JSON.stringify(err));
});
