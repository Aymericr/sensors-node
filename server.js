const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
const port = process.env.PORT || 8080;

app.use(express.json());
app.listen(port, () => console.log(`Listening on port ${port}!`));

const server = http.createServer(app);
const io = require('socket.io')(server, {
  handlePreflightRequest: (req, res) => {
    const headers = {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
      "Access-Control-Allow-Credentials": true
    };
    res.writeHead(200, headers);
    res.end();
  }
});

let socketIds;
io.on('connection', (socket) => {
  const socketClientName = socket.handshake.headers['x-clientid'];
  socketIds = Object.keys(io.sockets.connected);
  console.info(`Client connected [id=${socket.id}, name=${socketClientName}]`);
  console.log('socketIds', socketIds);

  const otherSocketIds = socketIds.filter( sid => sid !== socket.id );
  socket.emit('id-assignments', {self: socket.id, ids: otherSocketIds});
  otherSocketIds.forEach( sid => {
    io.sockets.connected[sid].emit('id-assignments', {self: sid, ids: socketIds.filter( i => i !== sid )})
  });

  socket.on('disconnect', () => {
    console.info(`Client disconnected [id=${socket.id}, name=${socketClientName}]`);
  });

  socket.on('exchange', (data, callback) => {
    data.from = socket.id;
    if (data.to) {
      data.to.forEach((sid)=>{
        io.sockets.connected[sid].emit('exchange', data);
      });
    }
    callback = () => 'success';
  });
});

server.listen(8000);

app.get('/', function (req, res) {
  // console.log('GET', req);
  res.sendFile(__dirname + '/index.html');
});
