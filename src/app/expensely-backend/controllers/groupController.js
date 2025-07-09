const Group = require('../models/Group');

// POST /api/groups - Create a group
exports.createGroup = async (req, res) => {
  try {
    const { name, members } = req.body;
    if (!name || !members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: 'Missing name or members' });
    }
    // Always include creator in members
    const creator = req.user.email;
    if (!members.includes(creator)) members.push(creator);

    const group = new Group({
      name,
      members,
      createdBy: creator
    });
    await group.save();
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
};

// GET /api/groups - List groups for logged-in user
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.email }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

// GET /api/groups/:groupId - Get single group
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    if (!group.members.includes(req.user.email)) return res.status(403).json({ error: 'Forbidden' });
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
};
