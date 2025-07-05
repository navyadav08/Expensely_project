exports.createGroup = async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;
    const group = await Group.create({ name, members, createdBy });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error });
  }
};
