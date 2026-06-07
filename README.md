# Arfa Exports Demo

This project now includes a local backend for Razorpay payment flow and order verification.

## Setup

1. Install Node.js (16+)
2. Open a terminal in `c:\Users\usham\Downloads\mobileapp`
3. Install dependencies:

```bash
npm install
```

4. Create `.env` from `.env.example` and add your Razorpay credentials:

```bash
copy .env.example .env
```

Then fill in:

```text
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

5. Start the backend server:

```bash
npm start
```

6. Open the site in your browser:

```
http://localhost:3000
```

## Notes

- Orders are created and stored in-memory on the backend.
- Payment is handled with Razorpay Checkout.
- The server verifies the Razorpay payment signature before confirming the order.
