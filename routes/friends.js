const express = require("express");
const User = require("../models/User");
const FriendRequest = require("../models/FriendRequest");

const router = express.Router();

// SEND FRIEND REQUEST
router.post("/send-request", async (req, res) => {
  const { receiverEmail } = req.body;
  const sender = await User.findById(req.user._id);
  const receiver = await User.findOne({ email: receiverEmail });

  if (!receiver) return res.json({ message: "User not found" });

  if(sender.friends.includes(receiver._id))
    return res.json({ message: "User is already your friend" });

  const existingRequest = await FriendRequest.findOne({
    sender: sender._id,
    receiver: receiver._id,
    status: "pending"
  });

  if (existingRequest) return res.json({ message: "Request already sent" });

  await FriendRequest.create({
    sender: sender._id,
    receiver: receiver._id
  });

  res.json({ message: "Friend request sent" });
});

router.post('/respond', async (req, res) => {
  const { requestId, action } = req.body;
  const validActions = ['accept', 'reject'];
  if (!validActions.includes(action)) {
    return res.status(400).json({ message: "Invalid action" });
  } 
    await FriendRequest.findById(requestId)
    .then(request => {
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
        if (request.receiver.toString() !== req.user._id.toString()) {  
            return res.status(403).json({ message: "Not authorized to respond to this request" });
        }
      request.status = action === 'accept' ? 'accepted' : 'rejected';
        if (action === 'accept') {
            return Promise.all([
                User.findByIdAndUpdate(request.sender, { $push: { friends: request.receiver } }),
                User.findByIdAndUpdate(request.receiver, { $push: { friends: request.sender } }),
                request.save()
            ]);
        }   else {
            return request.save();
        }
    })
    .then(() => {
      res.json({ message: `Friend request ${action}ed` });
    })
    .catch(err => {
      res.status(500).json({ message: "Server error", error: err.message });
    });
});


// GET FRIENDS
router.get("/my-friends", async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate("friends", "name email");

  res.json(user.friends);
});

// GET REQUESTS
router.get("/requests", async (req, res) => {
    const friendRequests = await FriendRequest.find({ receiver: req.user._id, status: "pending" })
    .populate("sender", "name email");

    console.log(friendRequests);

  res.json(friendRequests);
});

module.exports = router;
