var mysql = require('mysql')
var express = require('express')
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
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

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

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

app.get('/assets/css/select2.min.css', function(req, res) {
    res.sendFile(__dirname + '/assets/css/select2.min.css');
});

app.get('/assets/js/login.js', function(req, res) {
    res.sendFile(__dirname + '/assets/js/login.js');
});

app.get('/assets/js/select2.min.js', function(req, res) {
    res.sendFile(__dirname + '/assets/js/select2.min.js');
});

// routing
app.post('/regisAuth', function(req, res, next){
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
                var user = result[0];

                var sql = "update users set payload = ? where username = ?";
                var success = false;
                connection.query(sql, [req.sessionID,req.session.user.username], function (err, result) {
                    if (err) throw err;
                    if (result.affectedRows == 1) {
                        // return res.redirect('/messages');
                        res.send({ user: user });
                    }
                });
                console.log(username + ' logged in!');
            }
        });
    });
    console.log('user registered');
});

app.post('/loginAuth', function (req, res, next) {
    var sql = "select name, username, id from users where username = ? and password = ?";
    var username = req.body.lg_username;
    var password = req.body.lg_password;
    connection.query(sql, [username, password], function (err, result) {
        if (err) throw err;
        if (result.length == 1) {
            req.session.auth = true;
            req.session.user = result[0];
            var user = result[0];

            var sql = "update users set payload = ? where username = ?";
            var success = false;
            connection.query(sql, [req.sessionID,req.session.user.username], function (err, result) {
                if (err) throw err;
                if (result.affectedRows == 1) {
                    res.send({ user: user });
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

app.get('/getRoomDetail', function (req, res) {
    var room_id = req.query.id;
    var sql = "SELECT rooms.id as room_id, users.name, rooms.name as room_name, rooms.type, users.id, users.username FROM rooms INNER JOIN room_details ON room_details.room_id = rooms.id INNER JOIN users ON users.id = room_details.user_id WHERE rooms.id = ? AND users.id != ?";
    connection.query(sql, [room_id, req.query.user_id], function (err, results) {
        if (err) throw err;
        res.send(results[0]);
    });
});

app.get('/getChatMessage', function (req, res) {
    var sql = "select * from messages m, users u where m.user_id = u.id and room_id = ? order by m.timestamp";
    connection.query(sql, req.query.room_id, function (err, results) {
        if (err) throw err;
        res.send(results);
    });
});
app.get('/getOnlineUsers', function (req, res) {
    var sql = "select name, username, id from users where payload is not null and id != ?";
    connection.query(sql, req.query.user_id, function (err, results) {
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

app.post('/newPrivateChat', function(req, res){
    var target_user = req.body.target;
    var user = req.body.user;
    var string1 = user.name + target_user.name;
    var string2 = target_user.name + user.name;
    var sql = "select distinct rd.room_id, r.name from rooms r, room_details rd where r.id = rd.room_id and r.name in (?,?) and r.type = 'private'";
    connection.query(sql, [string1, string2], function (err, result) {
        if(result.length == 1) {
            res.send(result[0])
        }else {
            var sql = "insert into rooms (name, type) values (?,'private')";
            connection.query(sql, string1,function (err, result) {
                if (err) throw err
                var sql = "insert into room_details (room_id, user_id) values (?,?), (?,?)";
                connection.query(sql, [result.insertId, user.id, result.insertId, target_user.id],function (err, result) {
                    if (err) throw err
                    var sql = "select distinct rd.room_id, r.name from rooms r, room_details rd where r.id = rd.room_id and r.name in (?,?) and r.type = 'private'";
                    connection.query(sql, [string1, string2], function (err, result) {
                        if (err) throw err;
                        res.send(result[0]);
                    });
                });
            });
        }
    });
});

app.post('/newGroupChat', function(req, res){
    var room_name = req.body.name;
    var users = req.body.users;
    var sql = "insert into rooms (name, type) values (?,'group')";
    connection.query(sql, room_name,function (err, result) {
        if (err) throw err
        res.send({ room_id: result.insertId });
        // var temp_id = [];
        // var index = 1;
        // var count = users.length;
        // var sql = "insert into room_details (room_id, user_id) values";
        // users.forEach((user) => {
        //     if(index == count) {
        //         sql += '(?,?)';
        //     } else {
        //         sql += '(?,?),';
        //     }
        //     temp_id.push(result.insertId);
        //     temp_id.push(user);
        //     index++;
        // });
        // connection.query(sql, temp_id,function (err, result) {
        //     if (err) throw err
        // });
    });
});

app.get('/logout', function (req, res) {
    console.log(req.session);
    var sql = "update users set payload = NULL where username = ?";
    connection.query(sql, req.session.user.username, function (err, result) {
        if (err) throw err;
        if (result.affectedRows == 1) {
            console.log(req.session.user.username + ' logout!');
            req.session.destroy();
            res.send({ success: true });
        }
    });
});

app.get('/getRecentRoomChats', function (req, res) {
    var user_id = req.query.user_id;
    var sql = "SELECT rooms.id as room_id, users.name, rooms.name as room_name, rooms.type, users.id, users.username FROM rooms INNER JOIN room_details ON room_details.room_id = rooms.id INNER JOIN users ON users.id = room_details.user_id WHERE room_details.user_id = ?";
    connection.query(sql, user_id, function (err, results) {
        if (err) throw err;
        var data = {
            total: results.length,
            chats: results
        }
        res.send(data);
    });
});

app.get('/getAvailableUsers', function (req,res) {
    var sql = "select id, name from users where id not in (select user_id from room_details where room_id = ?)";
    connection.query(sql, req.query.room_id, function (err, results) {
        if (err) throw err;
        var data = {
            total: results.length,
            users: results
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
    socket.on('online_users', () => {
        var sql = "select name, username, id from users where payload is not null";
        connection.query(sql, function (err, results) {
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
            io.sockets.emit('online_users', userOnline);
        });
    });

    socket.on('SEND_MESSAGE', (data) => {
        var sql = "insert into messages (message, user_id, room_id) values (?,?,?)";
        connection.query(sql, [data.message, data.user.id, data.room_id],function (err, result) {
            if (err) throw err
        });
        socket.join(data.room_id);
        var message = {
            message: data.message,
            user_id: data.user.id,
            room_id: data.room_id
        };
        io.sockets.in(data.room_id).emit('GET_MESSAGE', message);
    });

    socket.on('INVITE_USER', (data) => {
        // console.log(data);
        var temp_id = [];
        var sql = "insert into room_details (room_id, user_id) values ";
        var count = data.user_id.length;
        var index = 1;
        data.user_id.forEach((item) => {
            if(index == count) {
                sql += '(?,?)';
            } else {
                sql += '(?,?),';
            }
            console.log(item);
            temp_id.push(data.room_id);
            temp_id.push(item);
            index++;
        });

        connection.query(sql, temp_id,function (err, result) {
            if (err) throw err
        });

        socket.join(data.room_id);
        io.sockets.emit('INVITED', {change: true});
    });

    socket.on('LEAVE_ROOM', (data) => {
        room_id = data.room_id
        user_id = data.user_id
        console.log(room_id)
        console.log(user_id)
        var sql = "DELETE FROM room_details WHERE room_id = ? AND user_id = ?";
        connection.query(sql, [room_id, user_id], function (err, result) {
            if (err) throw err
        });

        io.sockets.emit('LEFT_ROOM', {change: true});
    });


});

function getOnlineUsers(user_id) {
    var sql = "select name, username, id from users where payload is not null and id != ?";
    connection.query(sql, user_id, function (err, results) {
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
        return userOnline;
    });
}
