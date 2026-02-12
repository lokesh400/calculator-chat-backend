const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const LocalStrategy = require("passport-local");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const User = require("./models/User");
const WaitingMessage = require("./models/WaitingMessage");

mongoose.connect(process.env.MONGO_URI);

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "secretKey",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true }
  }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  { usernameField: "email" },
  User.authenticate()
));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use("/api/auth", require("./routes/auth"));
app.use("/api/friends", require("./routes/friends"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const EphemeralMessage = require("./models/EphemeralMessage");

const onlineUsers = {};

io.on("connection", (socket) => {

  socket.on("register", async (userId) => {
    onlineUsers[userId] = socket.id;

    await User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date()
    });

    // Deliver pending messages
    const pending = await EphemeralMessage.find({ to: userId });

    for (const msg of pending) {
      io.to(socket.id).emit("private_message", {
        ...msg.toObject(),
        _id: msg.clientId // use client ID for consistency
      });

      // Notify sender that message was delivered
      const senderSocket = onlineUsers[msg.from];
      if (senderSocket) {
        io.to(senderSocket).emit("message_delivered", {
          messageId: msg.clientId
        });
      }

      msg.status = "delivered";
      await msg.save();
    }

    io.emit("user_online", userId);
  });

  // SEND MESSAGE
  socket.on("private_message", async (data) => {
    const { from, to, cipher, iv, createdAt, _id } = data;

    const receiverSocket = onlineUsers[to];

    if (receiverSocket) {

      // Send to receiver
      io.to(receiverSocket).emit("private_message", {
        ...data,
        status: "delivered",
        _id: _id // ensure _id is set
      });

      // Tell sender it was delivered
      io.to(socket.id).emit("message_delivered", {
        messageId: _id
      });

    } else {

      // Store temporarily
      const saved = await EphemeralMessage.create({
        from,
        to,
        cipher,
        iv,
        createdAt,
        status: "sent",
        clientId: _id // store client's ID
      });

      // Tell sender it's only sent
      io.to(socket.id).emit("message_delivered", {
        messageId: _id
      });
    }
  });

  // READ RECEIPT
  socket.on("message_read", async ({ to, messageId }) => {

    const senderSocket = onlineUsers[to];

    if (senderSocket) {
      io.to(senderSocket).emit("message_read", {
        messageId
      });
    }

    // Find and delete by clientId
    const msg = await EphemeralMessage.findOneAndDelete({ clientId: messageId });
  });

  // TYPING INDICATORS
  socket.on("typing", ({ to }) => {
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("user_typing", { from: Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id) });
    }
  });

  socket.on("stop_typing", ({ to }) => {
    const receiverSocket = onlineUsers[to];
    if (receiverSocket) {
      io.to(receiverSocket).emit("user_stop_typing", { from: Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id) });
    }
  });

  socket.on("disconnect", async () => {
    const userId = Object.keys(onlineUsers)
      .find(key => onlineUsers[key] === socket.id);

    if (userId) {
      delete onlineUsers[userId];

      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      io.emit("user_offline", userId);
    }
  });

});




server.listen(5000, () => console.log("Server running on port 5000"));
