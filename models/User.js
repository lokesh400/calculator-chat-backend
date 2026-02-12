const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true
  },

  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
});

// ✅ DO NOT CALL IT — just pass the function
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email"
});

module.exports = mongoose.model("User", userSchema);
