const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const fs = require('fs');
// const path = require('path');

const clientId = "CLIENT_ID";
const clientSecret = 'CLIENT_SECRET';
const refreshToken = 'REFRESH_TOKEN';

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
oauth2Client.setCredentials({ refresh_token: refreshToken });
// oauth2Client.on(refreshToken, (refreshToken) => {
//   if (refreshToken) {
//     // OAuth2 client is successfully initialized and tokens are obtained.
//     console.log('OAuth2 client and tokens are ready.');
//   } else {
//     // Handle authentication errors here.
//     console.error('Error initializing OAuth2 client:', tokens);
//   }
// });


const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    type: 'OAuth2',
    user: 'tanishqtiwari463@gmail.com',
    clientId: clientId,
    clientSecret: clientSecret,
    refreshToken: refreshToken,
    accessToken: oauth2Client.getAccessToken(),
  },
});

const gmail = google.gmail({
  version: 'v1',
  auth: oauth2Client,
});

const conversationDataPath = 'conversations.json'; // Store conversation data in a JSON file
let conversationData = [];

function sendReply(emailId, senderEmail) {
  const message = {
    from: 'tanishqtiwari463@gmail.com',
    to: senderEmail,
    subject: 'Auto-reply',
    text: 'Thank you for your email. This is an automated reply. I am currently on a holiday I will get back to you in somedays.',
  };

  transporter.sendMail(message, (error, info) => {
    if (error) {
      console.error('Error sending automated reply:', error);
    } else {
      console.log('Automated reply sent:', info.response);
    }
  });

  // Mark the email as read
  gmail.users.messages.modify({
    userId: 'me',
    id: emailId,
    resource: {
      removeLabelIds: ['UNREAD'],
    },
  });
}

function loadConversationData() {
  if (conversationData.length === 0) return;
  try {
    const data = fs.readFileSync(conversationDataPath, 'utf8');
    conversationData = JSON.parse(data);
  } catch (error) {
    console.error('Error loading conversation data:', error);
  }
}

function saveConversationData() {
  fs.writeFileSync(conversationDataPath, JSON.stringify(conversationData), 'utf8');
}

async function checkEmailsAndSendReplies() {
  try {
    const response = await gmail.users.messages.list({ userId: 'me', labelIds: ["INBOX"], q: 'is:unread' });
    const emails = response.data.messages;
    // console.log('working fine.');
    if (emails && emails.length > 0) {
      for (const email of emails) {
        const message = await gmail.users.messages.get({ userId: 'me', id: email.id });
        const senderEmail = message.data.payload.headers.find(header => header.name === 'From').value;
        const threadId = message.data.threadId;

        if (!conversationData.includes(threadId)) {
          sendReply(email.id, senderEmail);
          conversationData.push(threadId);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for emails:', error);
  }
}

// Schedule the script to run periodically using node-cron
cron.schedule('*/40 * * * *', () => {
  console.log('Checking for new emails and sending automated replies...');
  checkEmailsAndSendReplies();
  saveConversationData(); // Save conversation data to remember conversations
});

console.log("Code Working....")
// checkEmailsAndSendReplies();
// Load conversation data at the beginning
loadConversationData();