const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const money = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const orderConfirmationEmail = (order) => {
  const itemsHtml = order.items
    .map((item) => {
      const options = [
        item.base?.colorName ? `Sole: ${escapeHtml(item.base.colorName)}` : '',
        item.strap?.colorName
          ? `Strap: ${escapeHtml(item.strap.colorName)}`
          : '',
        item.thumb?.colorName
          ? `Thumb: ${escapeHtml(item.thumb.colorName)}`
          : '',
      ]
        .filter(Boolean)
        .join(' · ');

      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;">
            <strong>${escapeHtml(item.name)}</strong>
            <div style="font-size:13px;color:#666;margin-top:4px;">
              Size: ${escapeHtml(item.size)}${options ? ` · ${options}` : ''}
            </div>
          </td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${money(item.lineTotal)}</td>
        </tr>`;
    })
    .join('');

  const address = order.shippingAddress;

  return `
<!doctype html>
<html>
<body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#222;">
  <div style="max-width:680px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;">
    <div style="padding:28px;background:#fdea07;">
      <h1 style="margin:0;font-size:26px;">Moochuu Footwear</h1>
      <p style="margin:8px 0 0;">Your order has been placed successfully 🎉</p>
    </div>

    <div style="padding:28px;">
      <h2 style="margin-top:0;">Order Confirmed</h2>
      <p>Thank you for shopping with us${order.shippingAddress?.name ? `, ${escapeHtml(order.shippingAddress.name)}` : ''}.</p>

      <p>
        <strong>Order Number:</strong> ${escapeHtml(order.orderNumber)}<br>
        <strong>Status:</strong> ${escapeHtml(order.orderStatus)}<br>
        <strong>Payment:</strong> ${escapeHtml(order.paymentMethod)}
      </p>

      <table style="width:100%;border-collapse:collapse;margin-top:20px;">
        <thead>
          <tr style="background:#f7f7f7;">
            <th style="padding:12px;text-align:left;">Product</th>
            <th style="padding:12px;text-align:center;">Qty</th>
            <th style="padding:12px;text-align:right;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="margin-top:20px;text-align:right;line-height:1.8;">
        <div>Subtotal: ${money(order.subtotal)}</div>
        <div>Shipping: ${money(order.shippingCharge)}</div>
        <div>Tax: ${money(order.tax)}</div>
        <div style="font-size:18px;font-weight:bold;">Total: ${money(order.totalAmount)}</div>
      </div>

      <div style="margin-top:25px;padding:18px;background:#fafafa;border-radius:8px;">
        <strong>Delivery Address</strong><br>
        ${escapeHtml(address.name)}<br>
        ${escapeHtml(address.phone)}<br>
        ${escapeHtml(address.addressLine1)}<br>
        ${escapeHtml(address.city)}, ${escapeHtml(address.state)} - ${escapeHtml(address.postalCode)}<br>
        ${address.landmark ? `Landmark: ${escapeHtml(address.landmark)}<br>` : ''}
        ${escapeHtml(address.country || 'India')}
      </div>

      <p style="margin-top:28px;color:#666;">We will keep you updated as your order progresses.</p>
    </div>
  </div>
</body>
</html>`;
};
