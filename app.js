const products = [
  { id: 1, name: 'Midnight Horn Mug', image: './horn-mug-black.jpg', price: 1500, desc: 'Premium horn drinking mug with a dark polished finish and carved handle.' },
  { id: 2, name: 'Ivory Horn Mug', image: './horn-mug-cream.webp', price: 1500, desc: 'Elegant ivory horn mug with smooth finish and natural bone texture.' },
  { id: 3, name: 'Thor Pendant', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=500&fit=crop', price: 34.99, desc: 'Norse-inspired Thor hammer pendant carved from bone with leather cord.' },
  { id: 4, name: 'Rune Pendant', image: 'https://images.unsplash.com/photo-1515562141207-6461a4b7b9e9?w=500&h=500&fit=crop', price: 38.99, desc: 'Ancient rune pendant with intricate bone carving.' },
  { id: 5, name: 'Wooden Bone Comb', image: 'https://images.unsplash.com/photo-1535191666141-6f90aa20ada8?w=500&h=500&fit=crop', price: 28.99, desc: 'Beautiful comb with bone and wood inlay for fine hair care.' },
  { id: 6, name: 'Carved Bone Comb', image: 'https://images.unsplash.com/photo-1535191666141-6f90aa20ada8?w=500&h=500&fit=crop', price: 32.99, desc: 'Intricately carved bone comb with decorative patterns.' },
  { id: 7, name: 'Bone Decorative Piece', image: 'https://images.unsplash.com/photo-1578747315822-137fbfc6ac53?w=500&h=500&fit=crop', price: 42.99, desc: 'Hand-carved decorative bone sculpture for collectors.' },
  { id: 8, name: 'Bone Dice Set', image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=500&h=500&fit=crop', price: 24.99, desc: 'Set of authentic bone dice with leather carrying pouch.' },
];

let cart = [];

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="viewProduct(${p.id})">
      <div class="product-image">
        <img src="${p.image}" alt="${p.name}" loading="lazy" />
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <div class="product-price">Rs ${p.price.toFixed(2)}</div>
        <p class="product-desc">${p.desc}</p>
        <button class="product-add" onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

function viewProduct(id) {
  const product = products.find(p => p.id === id);
  alert(`${product.name}\n\n${product.desc}\n\nPrice: Rs ${product.price.toFixed(2)}`);
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  const existingItem = cart.find(c => c.id === id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  updateCartUI();
}

function removeFromCart(id) {
  cart = cart.filter(c => c.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = itemsCount;
  
  const cartItemsDiv = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  
  if (cart.length === 0) {
    cartItemsDiv.innerHTML = '<p style="color: #999; padding: 20px; text-align: center;">Your cart is empty. Add some items!</p>';
    cartTotal.textContent = 'Rs 0.00';
  } else {
    cartItemsDiv.innerHTML = cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-details">
          <strong>${item.name}</strong><br>
          <small>Rs ${item.price.toFixed(2)} × ${item.quantity}</small>
        </div>
        <div class="cart-item-total">Rs ${(item.price * item.quantity).toFixed(2)}</div>
        <button onclick="removeFromCart(${item.id})" style="border: none; background: #ff6b6b; color: white; padding: 6px 12px; border-radius: 4px; cursor: pointer; margin-left: 8px;">Remove</button>
      </div>

    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `Rs ${total.toFixed(2)}`;
  }
}

function toggleCart() {
  if (cart.length === 0 && !document.getElementById('cartModal').classList.contains('active')) {
    alert('Add items to your cart first!');
    return;
  }
  document.getElementById('cartModal').classList.toggle('active');
}

function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }
  document.getElementById('cartModal').classList.remove('active');
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('checkoutTotal').textContent = `Rs ${total.toFixed(2)}`;
  document.getElementById('checkoutModal').classList.add('active');
  document.getElementById('successMessage').innerHTML = '';
}

function closeCheckout() {
  document.getElementById('checkoutModal').classList.remove('active');
  document.getElementById('checkoutForm').style.display = 'block';
}

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function completePayment() {
  const fullName = document.getElementById('fullName').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();
  const city = document.getElementById('city').value.trim();
  const postal = document.getElementById('postal').value.trim();
  const country = document.getElementById('country').value.trim();

  if (!fullName || !email || !phone || !address || !city || !postal || !country) {
    alert('Please fill in all fields!');
    return;
  }

  if (cart.length === 0) {
    alert('Your cart is empty!');
    return;
  }

  const payload = {
    fullName,
    email,
    phone,
    address,
    city,
    postal,
    country,
    cart,
  };

  const response = await fetch('/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    alert(data.error || 'Unable to create order. Please try again.');
    return;
  }

  if (data.mock) {
    const verifyResponse = await fetch('/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderId,
        razorpay_payment_id: `mock_payment_${Date.now()}`,
        razorpay_order_id: data.razorpayOrderId,
        razorpay_signature: 'mock_signature',
      }),
    });

    const verifyData = await verifyResponse.json();
    if (!verifyResponse.ok || !verifyData.success) {
      alert(verifyData.error || 'Mock payment verification failed.');
      return;
    }

    showOrderConfirmation(verifyData.order);
    return;
  }

  const scriptLoaded = await loadRazorpayScript();
  if (!scriptLoaded) {
    alert('Unable to load payment gateway. Please try again later.');
    return;
  }

  const options = {
    key: data.key,
    amount: data.amount,
    currency: data.currency,
    name: 'Arfa Exports',
    description: 'Handcrafted bone & horn order',
    order_id: data.razorpayOrderId,
    handler: async function (paymentResponse) {
      const verifyResponse = await fetch('/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderId,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_signature: paymentResponse.razorpay_signature,
        }),
      });

      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData.success) {
        alert(verifyData.error || 'Payment verification failed.');
        return;
      }

      showOrderConfirmation(verifyData.order);
    },
    prefill: {
      name: fullName,
      email: email,
      contact: phone,
    },
    notes: {
      address: `${address}, ${city}, ${postal}, ${country}`,
    },
    theme: {
      color: '#7de1ff',
    },
  };

  const rzp = new Razorpay(options);
  rzp.on('payment.failed', function (response) {
    alert('Payment failed: ' + (response.error.description || 'Please try again.'));
  });
  rzp.open();
}

function showOrderConfirmation(order) {
  document.getElementById('checkoutForm').style.display = 'none';
  const successDiv = document.getElementById('successMessage');
  const totalAmount = (order.amount / 100).toFixed(2);
  successDiv.innerHTML = `
    <div class="success-message">
      <strong>✓ Payment Successful!</strong>
      <p>Your order ${order.orderId} is confirmed.</p>
    </div>
    <div style="background: rgba(255,255,255,0.06); padding: 16px; border-radius: 12px; color: #eef4ff; white-space: pre-line; font-size: 0.95rem; line-height: 1.6;">
      Order Total: Rs ${totalAmount}\n
      Items: ${order.cart.reduce((sum, item) => sum + item.quantity, 0)}\n
      Payment ID: ${order.razorpayPaymentId}\n
      Shipping to:\n${order.address}\n${order.city}, ${order.postal}\n${order.country}
    </div>
  `;

  const checkoutBtn = document.querySelector('#checkoutModal .btn');
  if (checkoutBtn) {
    checkoutBtn.textContent = 'Close';
    checkoutBtn.onclick = () => {
      cart = [];
      updateCartUI();
      closeCheckout();
      document.getElementById('checkoutForm').style.display = 'block';
    };
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
});
