const express = require("express");
const cors = require("cors"); // Import cors
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});

const serverless = require("serverless-http");
const router = express.Router();

router.get("/", (req, res) => {
    res.send("App is running..");
});

app.use("/.netlify/functions/app", router);
module.exports.handler = serverless(app);

app.use(cors()); // Use cors middleware
app.use("/peerjs", peerServer);

io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on("join-room", (roomId, user) => {
    console.log(`User ${JSON.stringify(user)} joined room ${roomId}`);
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", user);
    
    socket.on("message", (message) => {
      console.log(`Message from ${JSON.stringify(user)} in room ${roomId}: ${message}`);
      io.to(roomId).emit("createMessage", message);
    });

    socket.on("disconnect", () => {
      console.log(`User ${JSON.stringify(user)} disconnected from room ${roomId}`);
      socket.broadcast.to(roomId).emit("user-disconnected", user);
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`server is running on port ${process.env.PORT || 3000}`);
});
