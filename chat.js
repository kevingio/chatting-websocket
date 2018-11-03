var mysql = require('mysql')
var express = require('express')
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'kevin',
  database : 'pwl'
});

connection.connect();

const app = express();
const port = 3000;

var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// init session
var cookieParser = require('cookie-parser');
var session = require('express-session')
app.use(cookieParser());
app.use(session({
    secret: 'AWOMSMDJQWNODSAOKDO',
    resave: true,
    saveUninitialized: false
}));

app.get('/chat', function(req, res) {
    if(!req.session.auth) {
        return res.redirect('/')
    }
    res.sendFile(__dirname + '/index.html');
});

app.get('/', function(req, res) {
    if(req.session.auth == true) {
        return res.redirect('/chat')
    }
    res.sendFile(__dirname + '/login.html');
});

app.get('/assets/css/login.css', function(req, res) {
    res.sendFile(__dirname + '/assets/css/login.css');
});

app.get('/assets/css/index.css', function(req, res) {
    res.sendFile(__dirname + '/assets/css/index.css');
});

app.get('/assets/js/login.js', function(req, res) {
    res.sendFile(__dirname + '/assets/js/login.js');
});

app.get('/assets/js/custom-login.js', function(req, res) {
    res.sendFile(__dirname + '/assets/js/custom-login.js');
});

// routing
app.post('/regisAuth', function(req, res){
    var username = req.body.reg_username;
    var password = req.body.reg_password;
    var name = req.body.reg_fullname;
    var sql = "insert into users (username, password, name) values (?,?,?)";
    connection.query(sql, [username, password, name],function (err, result) {
        if (err) throw err
        var sql = "select name, username, id from users where username = ? and password = ?";
        connection.query(sql, [username, password], function (err, result) {
            if (err) throw err;
            if (result.length == 1) {
                req.session.auth = true;
                req.session.user = result[0];

                var sql = "update users set payload = ? where username = ?";
                var success = false;
                connection.query(sql, [req.sessionID,req.session.user.username], function (err, result) {
                    if (err) throw err;
                    if (result.affectedRows == 1) {
                        return res.redirect('/chat');
                    }
                });
                console.log(username + ' logged in!');
            }
        });
    });
    console.log('user registered');
});

app.post('/loginAuth', function (req, res) {
    var sql = "select name, username, id from users where username = ? and password = ?";
    var username = req.body.lg_username;
    var password = req.body.lg_password;
    connection.query(sql, [username, password], function (err, result) {
        if (err) throw err;
        if (result.length == 1) {
            req.session.auth = true;
            req.session.user = result[0];

            var sql = "update users set payload = ? where username = ?";
            var success = false;
            connection.query(sql, [req.sessionID,req.session.user.username], function (err, result) {
                if (err) throw err;
                if (result.affectedRows == 1) {
                    return res.redirect('/chat');
                }
            });
            console.log(username + ' logged in!');
        }
    });
});

app.get('/getLoggedInUser', function (req, res) {
    var user = req.session.user;
    res.send(user);
});

app.get('/getChatMessage', function (req, res) {
    var sql = "select * from messages where room_id = ?";
    connection.query(sql, req.query.room_id, function (err, results) {
        if (err) throw err;
        res.send(results);
    });
});

app.get('/getOnlineUsers', function (req, res) {
    var sql = "select name, username, id from users where payload is not null and id != ?";
    connection.query(sql, req.session.user.id, function (err, results) {
        if (err) throw err;
        if (results.length > 0) {
            var userOnline = {
                total: results.length,
                users: results
            };
        }else {
            var userOnline = {
                total: 0,
                data: []
            };
        }
        res.send(userOnline);
    });
});

app.get('/logout', function (req, res) {
    var sql = "update users set payload = NULL where username = ?";
    var success = false;
    connection.query(sql, req.session.user.username, function (err, result) {
        if (err) throw err;
        if (result.affectedRows == 1) {
            console.log(req.session.user.username + ' logout!');
            req.session.destroy();
            success = true;
            return res.redirect('/');
        }
    });
});

app.get('/getRecentRoomChats', function (req, res) {
    var sql = "select u.id, r.name as room_name, r.type, u.name, u.username, rd.room_id from room_details rd, rooms r, users u where u.id = rd.user_id and r.id = rd.room_id and u.id != ? order by r.timestamp";
    connection.query(sql, req.session.user.id, function (err, results) {
        if (err) throw err;
        var data = {
            total: results.length,
            chats: results
        }
        res.send(data);
    });
});

const server = app.listen(port, function() {
    console.log(`chatting app listening on port ${port}!`);
});

const io = require('socket.io')(server);
const self = this;

io.on('connect', (socket) => {
    console.log('connected!');

    socket.on('room', (room) => {
        socket.join(room);
        // var messages = getMessages(room);
        io.sockets.in("abc123").emit('message', 'what is going on, party people?');
        io.sockets.in('foobar').emit('message', 'anyone in this room yet?');
    });

    socket.on('get_recent_chat', (username) => {
        io.sockets.emit('recent_chat', getRecentChats(username));
    });
});

function getMessages(room) {
    var sql = "select * from messages m, rooms r, users u where u.id = m.user_id and m.room_id = r.id and r.name = ?";
    connection.query(sql, room, function (err, results) {
        if (err) throw err;
        var data = [];
        if (results.length > 0) {
            data = results
        }
        return data;
    });
}
