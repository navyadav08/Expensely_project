const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const requireAuth = require('../middleware/requireAuth'); // authentication middleware

// POST /api/groups - Create group
router.post('/', requireAuth, async (req, res) => {
  const { name, members } = req.body;
  const creatorEmail = req.user.email; // comes from token, not userId from client

  try {
    // Always include creator in members
    const groupMembers = members && Array.isArray(members) ? Array.from(new Set([...members, creatorEmail])) : [creatorEmail];

    const newGroup = new Group({
      name,
      members: groupMembers,
      createdBy: creatorEmail,
    });

    await newGroup.save();
    res.status(201).json(newGroup);
  } catch (err) {
    res.status(500).json({ message: 'Error creating group', error: err.message });
  }
});

// GET /api/groups - List groups this user is a member of
router.get('/', requireAuth, async (req, res) => {
  const userEmail = req.user.email;
  try {
    const groups = await Group.find({ members: userEmail });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching groups', error: err.message });
  }
});

// GET /api/groups/:groupId - Get group details
router.get('/:groupId', requireAuth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (!group.members.includes(req.user.email)) return res.status(403).json({ message: 'Forbidden' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching group', error: err.message });
  }
});

module.exports = router;
