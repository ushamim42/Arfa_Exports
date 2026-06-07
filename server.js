const express = require('express');
const Razorpay = require('razorpay');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'YOUR_RAZORPAY_KEY_ID';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_RAZORPAY_KEY_SECRET';
const MOCK_RAZORPAY = process.env.MOCK_RAZORPAY === 'true';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'ushamim42@gmail.com';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';

const emailEnabled = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
const mailTransport = emailEnabled
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

if (emailEnabled) {
  console.log('Email notifications are enabled.');
} else {
  console.warn('Email is not fully configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to send confirmation emails.');
}


if (MOCK_RAZORPAY) {
  console.warn('Mock Razorpay mode enabled. Backend will create fake orders and bypass real Razorpay API calls.');
} else if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('Warning: Razorpay keys are not configured. Copy .env.example to .env and set your Razorpay credentials.');
}

const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});

const orders = new Map();

function buildOrderEmail(order) {
  const totalAmount = (order.amount / 100).toFixed(2);
  const itemLines = order.cart
    .map(item => `${item.quantity}× ${item.name} - Rs ${(item.price * item.quantity).toFixed(2)}`)
    .join('\n');

  return {
    subject: `Order Confirmation - ${order.orderId}`,
    text: `Thank you for your purchase, ${order.fullName}.\n\n` +
      `Order ID: ${order.orderId}\n` +
      `Payment ID: ${order.razorpayPaymentId || 'N/A'}\n` +
      `Order Total: Rs ${totalAmount}\n\n` +
      `Items:\n${itemLines}\n\n` +
      `Shipping Address:\n${order.address}\n${order.city}, ${order.postal}\n${order.country}\n\n` +
      `We will notify you once your order is shipped.`,
    html: `
      <h2>Order Confirmation</h2>
      <p>Thank you for your purchase, <strong>${order.fullName}</strong>.</p>
      <p><strong>Order ID:</strong> ${order.orderId}<br>
      <strong>Payment ID:</strong> ${order.razorpayPaymentId || 'N/A'}<br>
      <strong>Order Total:</strong> Rs ${totalAmount}</p>
      <h3>Items</h3>
      <ul>${order.cart
        .map(item => `<li>${item.quantity}× ${item.name} - Rs ${(item.price * item.quantity).toFixed(2)}</li>`)
        .join('')}</ul>
      <h3>Shipping Address</h3>
      <p>${order.address}<br>${order.city}, ${order.postal}<br>${order.country}</p>
      <p>We will notify you once your order is shipped.</p>
    `,
  };
}

async function sendOrderEmails(order) {
  if (!emailEnabled) {
    return;
  }

  const emailContent = buildOrderEmail(order);

  await mailTransport.sendMail({
    from: SMTP_USER,
    to: order.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
  });

  await mailTransport.sendMail({
    from: SMTP_USER,
    to: ADMIN_EMAIL,
    subject: `New Order Received - ${order.orderId}`,
    text: `A new order has been received.\n\n${emailContent.text}`,
    html: `
      <h2>New Order Received</h2>
      <p>A new order has been placed with the following details:</p>
      ${emailContent.html}
    `,
  });
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Main.html'));
});

app.post('/create-order', async (req, res) => {
  const { fullName, email, phone, address, city, postal, country, cart } = req.body;

  if (!fullName || !email || !phone || !address || !city || !postal || !country || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Invalid order request. All fields are required.' });
  }

  const amount = Math.round(cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 100);
  const currency = 'INR';
  const receipt = `receipt_${Date.now()}`;

  try {
    const razorpayOrder = MOCK_RAZORPAY
      ? { id: `mock_order_${Date.now()}` }
      : await razorpay.orders.create({
          amount,
          currency,
          receipt,
          payment_capture: 1,
        });

    const orderId = crypto.randomUUID();
    const orderRecord = {
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      receipt,
      fullName,
      email,
      phone,
      address,
      city,
      postal,
      country,
      cart,
      status: 'created',
      createdAt: new Date().toISOString(),
    };

    orders.set(orderId, orderRecord);

    return res.json({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      key: MOCK_RAZORPAY ? 'MOCK_KEY' : RAZORPAY_KEY_ID,
      fullName,
      email,
      phone,
      mock: MOCK_RAZORPAY,
    });
  } catch (error) {
    console.error('create-order error', error);
    return res.status(500).json({ error: 'Unable to create payment order. Please try again later.' });
  }
});

app.post('/verify-payment', async (req, res) => {
  const { orderId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

  if (!orderId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment verification fields.' });
  }

  const orderRecord = orders.get(orderId);
  if (!orderRecord) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (MOCK_RAZORPAY) {
    orderRecord.status = 'paid';
    orderRecord.razorpayPaymentId = razorpay_payment_id || `mock_payment_${Date.now()}`;
    orderRecord.updatedAt = new Date().toISOString();

    if (emailEnabled) {
      try {
        await sendOrderEmails(orderRecord);
      } catch (error) {
        console.error('Error sending confirmation emails:', error);
      }
    }

    return res.json({ success: true, order: orderRecord });
  }

  const generatedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({ error: 'Payment verification failed.' });
  }

  orderRecord.status = 'paid';
  orderRecord.razorpayPaymentId = razorpay_payment_id;
  orderRecord.updatedAt = new Date().toISOString();

  if (emailEnabled) {
    try {
      await sendOrderEmails(orderRecord);
    } catch (error) {
      console.error('Error sending confirmation emails:', error);
    }
  }

  return res.json({ success: true, order: orderRecord });
});

app.get('/orders/:orderId', (req, res) => {
  const orderRecord = orders.get(req.params.orderId);
  if (!orderRecord) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  return res.json(orderRecord);
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
