// backend/routes/groupRoutes.js

const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((error, success) => {
  if (error) console.error('Email config error:', error);
  else console.log('Email server ready');
});

// Function to send invite emails
const sendInvitationEmails = async (emails, groupName, createdBy) => {
  const mailPromises = emails.map(email => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `You're invited to join group: ${groupName}`,
      html: `
        <p>Hello!</p>
        <p>You have been added to the group <b>${groupName}</b> by ${createdBy}.</p>
        <p>Please login to view or manage your expenses.</p>
        <p>– Team Expensely</p>
      `
    };
    return transporter.sendMail(mailOptions);
  });

  return Promise.all(mailPromises);
};

// GET all groups for a user (by email)
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const groups = await Group.find({ members: email.toLowerCase() }).sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    console.error('Fetch groups error:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// POST create group
router.post('/', [
  body('name').trim().notEmpty(),
  body('members').isArray({ min: 1 }),
  body('createdBy').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, members, createdBy } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = members.filter(email => !emailRegex.test(email));
    if (invalidEmails.length) return res.status(400).json({ error: 'Invalid email(s)', invalidEmails });

    const uniqueMembers = [...new Set(members.map(email => email.toLowerCase()))];

    const group = new Group({
      name,
      members: uniqueMembers,
      createdBy,
      bills: [],
      createdAt: new Date()
    });

    await group.save();
    await sendInvitationEmails(uniqueMembers, name, createdBy);

    res.status(201).json(group);
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Group creation failed' });
  }
});

// POST add bill
router.post('/:groupId/bills', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, totalAmount, createdBy } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const splitAmount = totalAmount / group.members.length;

    const payments = group.members.map(email => ({
      memberEmail: email,
      amount: splitAmount,
      paid: false,
      paidAt: null
    }));

    const bill = {
      description,
      totalAmount,
      splitAmount,
      createdBy,
      createdAt: new Date(),
      payments
    };

    group.bills.push(bill);
    await group.save();

    res.status(201).json({ message: 'Bill added and split successfully' });
  } catch (err) {
    console.error('Add bill error:', err);
    res.status(500).json({ error: 'Failed to add bill' });
  }
});

// PATCH mark payment
router.patch('/:groupId/bills/:billId/payment', async (req, res) => {
  try {
    const { groupId, billId } = req.params;
    const { memberEmail, paid, paidAt } = req.body;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const bill = group.bills.id(billId);
    if (!bill) return res.status(404).json({ error: 'Bill not found' });

    const payment = bill.payments.find(p => p.memberEmail === memberEmail);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.paid = paid;
    payment.paidAt = paidAt;

    await group.save();
    res.json({ message: 'Payment status updated' });
  } catch (err) {
    console.error('Payment update error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// POST send reminder
router.post('/:groupId/bills/:billId/reminder', async (req, res) => {
  try {
    const { groupId, billId } = req.params;
    const { memberEmail, billDescription, amount } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: memberEmail,
      subject: `Reminder: Payment due for ${billDescription}`,
      html: `
        <p>This is a friendly reminder to pay your share <strong>$${amount}</strong> for: <strong>${billDescription}</strong>.</p>
        <p>Please complete your payment soon.</p>
        <p>– Team Expensely</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reminder sent' });
  } catch (err) {
    console.error('Send reminder error:', err);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

module.exports = router;
