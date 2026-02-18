const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('./middleware/auth'); // Ensure path is correct for your folder structure

// Smart Knowledge Base
const knowledgeBase = [
  { 
    keywords: ['hello', 'hi', 'hey'], 
    response: 'Hello! I am your assistant. How can I help you manage your loans today?',
    type: 'greeting'
  },
  { 
    keywords: ['loan', 'apply'], 
    response: 'Applying is easy! Navigate to the <b>"New Loan"</b> section in your dashboard.',
    link: '/new-loan-form',
    actionText: 'Apply Now'
  },
  { 
    keywords: ['document', 'upload'], 
    response: 'You can upload pending documents in the <b>Loan Details</b> page for your specific application.',
    type: 'info'
  },
  { 
    keywords: ['support', 'help', 'human', 'issue'], 
    response: 'I can connect you to our support team. You can raise a ticket directly.',
    link: '/support-tickets',
    actionText: 'Open Support Ticket'
  },
  { 
    keywords: ['interest', 'rate'], 
    response: 'Our personal loan rates start at <b>10.5% p.a.</b> depending on your credit score.',
    type: 'info'
  },
  { 
    keywords: ['emi', 'calculate'], 
    response: 'Use our EMI Calculator to estimate your monthly payments.',
    link: '/emi-calculator',
    actionText: 'Go to Calculator'
  }
];

router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;
    const lowerMsg = message.toLowerCase();

    // 🟢 LAZY LOAD: We define the model HERE, not at the top.
    // This prevents the "MissingSchemaError" because server.js has finished loading by now.
    const LoanApplication = mongoose.model('LoanApplication');

    let responseData = {
      text: "I'm not sure about that. Could you try rephrasing? You can ask about your <b>Application Status</b>, <b>Next EMI</b>, or <b>Loan Balance</b>.",
      sender: 'bot',
      timestamp: new Date()
    };

    // 1. Dynamic Data: Status Check
    if (lowerMsg.includes('status') || lowerMsg.includes('application')) {
      const latest = await LoanApplication.findOne({ userId }).sort({ createdAt: -1 });
      
      if (latest) {
        // Create a nice HTML response with a badge
        let badgeColor = 'bg-secondary';
        if (latest.applicationStatus === 'approved') badgeColor = 'bg-success';
        if (latest.applicationStatus === 'rejected') badgeColor = 'bg-danger';
        if (latest.applicationStatus === 'pending') badgeColor = 'bg-warning text-dark';

        responseData.text = `Your application for <b>${latest.loanType || 'Loan'}</b> is currently <span class="badge ${badgeColor}">${latest.applicationStatus.toUpperCase()}</span>.`;
        
        // Link to that specific loan
        responseData.link = `/loan-application-list`; 
        responseData.actionText = "View My Loans";
      } else {
        responseData.text = "customers don't have any active loan applications yet.";
        responseData.link = "/new-loan-form";
        responseData.actionText = "Start Application";
      }
      return res.json(responseData);
    }

    // 2. Dynamic Data: Outstanding Balance
   // ... inside router.post('/chat', ...)

    // 2. Dynamic Data: Outstanding Balance
    if (lowerMsg.includes('balance') || lowerMsg.includes('outstanding')) {
      
      // Correct Logic: Find loans where the user actually owes money
      // We check if 'outstandingBalance' exists and is greater than 0
      const activeLoans = await LoanApplication.find({ 
        userId, 
        outstandingBalance: { $gt: 0 } 
      });
      
      if (activeLoans.length > 0) {
        // Correct Logic: Sum up the 'outstandingBalance', not the 'approvedAmount'
        const total = activeLoans.reduce((acc, loan) => {
          return acc + (loan.outstandingBalance || 0);
        }, 0);

        responseData.text = `You have <b>${activeLoans.length} active loans</b>. Total outstanding balance: <b>₹${total.toLocaleString('en-IN')}</b>.`;
        responseData.link = "/loan-application-list"; // Redirect to your loan list
        responseData.actionText = "View Loans";
      } else {
        responseData.text = "You have no outstanding loan balances at the moment.";
      }
      return res.json(responseData);
    }

    // 3. Static Knowledge Base Search
    const found = knowledgeBase.find(kb => kb.keywords.some(k => lowerMsg.includes(k)));
    if (found) {
      responseData.text = found.response;
      if (found.link) {
        responseData.link = found.link;
        responseData.actionText = found.actionText || 'Go There';
      }
    }

    res.json(responseData);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;