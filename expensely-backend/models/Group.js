// models/Group.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  memberEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paid: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date,
    default: null
  }
});

const BillSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
    trim: true
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  splitAmount: {
    type: Number,
    required: true,
    min: 0
  },
  createdBy: {
    type: String, // or mongoose.Schema.Types.ObjectId if you have User model
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  payments: [PaymentSchema]
});

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  members: [{
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  }],
  createdBy: {
    type: String, // or mongoose.Schema.Types.ObjectId if you have User model
    required: true
  },
  bills: [BillSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
GroupSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual to get total amount spent in group
GroupSchema.virtual('totalSpent').get(function() {
  return this.bills.reduce((total, bill) => total + bill.totalAmount, 0);
});

// Virtual to get number of pending payments
GroupSchema.virtual('pendingPayments').get(function() {
  return this.bills.reduce((total, bill) => {
    return total + bill.payments.filter(payment => !payment.paid).length;
  }, 0);
});

// Method to get member's total dues
GroupSchema.methods.getMemberDues = function(memberEmail) {
  return this.bills.reduce((total, bill) => {
    const payment = bill.payments.find(p => p.memberEmail === memberEmail);
    return total + (payment && !payment.paid ? payment.amount : 0);
  }, 0);
};

// Method to get group summary
GroupSchema.methods.getGroupSummary = function() {
  const totalBills = this.bills.length;
  const totalAmount = this.totalSpent;
  const pendingPayments = this.pendingPayments;
  const completedPayments = this.bills.reduce((total, bill) => {
    return total + bill.payments.filter(payment => payment.paid).length;
  }, 0);

  return {
    totalBills,
    totalAmount,
    pendingPayments,
    completedPayments,
    memberCount: this.members.length
  };
};

// Static method to find groups by member email
GroupSchema.statics.findByMemberEmail = function(email) {
  return this.find({
    $or: [
      { members: { $in: [email] } },
      { 'bills.payments.memberEmail': email }
    ]
  });
};

// Indexes for better performance
GroupSchema.index({ createdBy: 1 });
GroupSchema.index({ members: 1 });
GroupSchema.index({ createdAt: -1 });
GroupSchema.index({ 'bills.createdAt': -1 });

module.exports = mongoose.model('Group', GroupSchema);