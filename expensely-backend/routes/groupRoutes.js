const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

// Configure nodemailer (you'll need to set up your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// GET /api/groups/user/:userId - Get all groups for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const groups = await Group.find({ createdBy: userId }).sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});


// POST /api/groups - Create a new group
router.post('/', [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  body('members').isArray({ min: 1 }).withMessage('At least one member is required'),
  body('createdBy').notEmpty().withMessage('Creator ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, members, createdBy } = req.body;

    // Validate email format for members
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = members.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid email addresses', 
        invalidEmails 
      });
    }

    // Create new group
    const group = new Group({
      name,
      members,
      createdBy,
      bills: [],
      createdAt: new Date()
    });

    await group.save();

    // Send invitation emails to members
    await sendInvitationEmails(members, name, createdBy);

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// POST /api/groups/:groupId/bills - Create a new bill in a group
router.post('/:groupId/bills', [
  body('description').trim().notEmpty().withMessage('Bill description is required'),
  body('totalAmount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
  body('createdBy').notEmpty().withMessage('Creator ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId } = req.params;
    const { description, totalAmount, createdBy } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Calculate split amount
    const splitAmount = totalAmount / group.members.length;

    // Create bill object
    const bill = {
      _id: new mongoose.Types.ObjectId(),
      description,
      totalAmount,
      splitAmount,
      createdBy,
      createdAt: new Date(),
      payments: group.members.map(memberEmail => ({
        memberEmail,
        amount: splitAmount,
        paid: false,
        paidAt: null
      }))
    };

    // Add bill to group
    group.bills.push(bill);
    await group.save();

    // Send bill notification emails
    await sendBillNotifications(group.members, group.name, description, splitAmount);

    res.status(201).json(bill);
  } catch (error) {
    console.error('Error creating bill:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
});

// PATCH /api/groups/:groupId/bills/:billId/payment - Update payment status
router.patch('/:groupId/bills/:billId/payment', [
  body('memberEmail').isEmail().withMessage('Valid email is required'),
  body('paid').isBoolean().withMessage('Payment status must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId, billId } = req.params;
    const { memberEmail, paid, paidAt } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const bill = group.bills.id(billId);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const payment = bill.payments.find(p => p.memberEmail === memberEmail);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.paid = paid;
    payment.paidAt = paid ? (paidAt || new Date()) : null;

    await group.save();

    res.json({ message: 'Payment status updated successfully', payment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// POST /api/groups/:groupId/bills/:billId/reminder - Send payment reminder
router.post('/:groupId/bills/:billId/reminder', [
  body('memberEmail').isEmail().withMessage('Valid email is required'),
  body('billDescription').trim().notEmpty().withMessage('Bill description is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { groupId, billId } = req.params;
    const { memberEmail, billDescription, amount } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const bill = group.bills.id(billId);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Send reminder email
    await sendReminderEmail(memberEmail, group.name, billDescription, amount);

    res.json({ message: 'Reminder sent successfully' });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// GET /api/groups/:groupId - Get specific group with bills
router.get('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await Group.findById(groupId).populate('createdBy', 'name email');
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// DELETE /api/groups/:groupId - Delete a group
router.delete('/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Only creator can delete the group
    if (group.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Only group creator can delete the group' });
    }

    await Group.findByIdAndDelete(groupId);
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// Helper function to send invitation emails
async function sendInvitationEmails(members, groupName, createdBy) {
  try {
    for (const memberEmail of members) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: memberEmail,
        subject: `You've been invited to join "${groupName}" group`,
        html: `
          <h2>Group Invitation</h2>
          <p>You've been invited to join the group "<strong>${groupName}</strong>"</p>
          <p>You can now split bills and manage expenses together!</p>
          <p>Download the app to get started.</p>
          <br>
          <p>Best regards,<br>Budget Manager Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    console.error('Error sending invitation emails:', error);
  }
}

// Helper function to send bill notifications
async function sendBillNotifications(members, groupName, billDescription, amount) {
  try {
    for (const memberEmail of members) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: memberEmail,
        subject: `New bill in "${groupName}" group`,
        html: `
          <h2>New Bill Added</h2>
          <p>A new bill has been added to your group "<strong>${groupName}</strong>"</p>
          <p><strong>Description:</strong> ${billDescription}</p>
          <p><strong>Your share:</strong> $${amount.toFixed(2)}</p>
          <p>Please check the app to mark your payment status.</p>
          <br>
          <p>Best regards,<br>Budget Manager Team</p>
        `
      };

      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    console.error('Error sending bill notifications:', error);
  }
}

// Helper function to send reminder emails
async function sendReminderEmail(memberEmail, groupName, billDescription, amount) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: memberEmail,
      subject: `Payment Reminder - "${groupName}" group`,
      html: `
        <h2>Payment Reminder</h2>
        <p>This is a friendly reminder about your pending payment in the group "<strong>${groupName}</strong>"</p>
        <p><strong>Bill:</strong> ${billDescription}</p>
        <p><strong>Amount due:</strong> $${amount.toFixed(2)}</p>
        <p>Please settle your payment and update your status in the app.</p>
        <br>
        <p>Best regards,<br>Budget Manager Team</p>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending reminder email:', error);
  }
}

module.exports = router;    