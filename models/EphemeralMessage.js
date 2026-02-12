const mongoose = require("mongoose");

const ephemeralMessageSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  cipher: {
    type: String,
    required: true
  },
  iv: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["sent", "delivered"],
    default: "sent"
  },
  clientId: {
    type: String,
    required: true
  }
});

// Optional: auto-delete after 10 minutes
ephemeralMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 600 }
);

module.exports = mongoose.model("EphemeralMessage", ephemeralMessageSchema);
