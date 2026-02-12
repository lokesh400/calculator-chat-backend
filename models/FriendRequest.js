  friendRequests: [
    
  ]

const mongoose = require("mongoose");

const RequestSchema = new mongoose.Schema({
sender: {type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }, 
timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FriendRequest", RequestSchema);
