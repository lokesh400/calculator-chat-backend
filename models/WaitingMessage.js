const mongoose = require("mongoose");

const waitingMessageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  message: String,
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 300 // auto delete after 5 minutes
  }
});

module.exports = mongoose.model("WaitingMessage", waitingMessageSchema);
