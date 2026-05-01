import { Injectable } from '@nestjs/common';
import { ReceiptData } from './receipts.service';

@Injectable()
export class ReceiptFormatterService {
  /**
   * Generate an HTML receipt that can be rendered in the browser or converted to PDF
   */
  generateReceiptHtml(receipt: ReceiptData): string {
    const formatCurrency = (kobo: number) => {
      const naira = kobo / 100;
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
      }).format(naira);
    };

    const formatDate = (date: Date | null) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('en-NG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    const itemsHtml = receipt.items
      .map((item) => {
        const hasSubItems = (item.bundlePerks && item.bundlePerks.length > 0) || item.bundleAllocations;
        const cellClass = hasSubItems ? 'item-cell no-border' : 'item-cell';

        let html = `
          <tr>
            <td class="${cellClass} main-item">
              <strong>${item.title}</strong>
            </td>
            <td class="${cellClass} center">${item.quantity}</td>
            <td class="${cellClass} right">${formatCurrency(item.unitPriceKobo)}</td>
            <td class="${cellClass} right"><strong>${formatCurrency(item.totalKobo)}</strong></td>
          </tr>
        `;

        if (item.bundlePerks && item.bundlePerks.length > 0) {
          html += `
            <tr>
              <td colspan="4" class="sub-item-cell">
                <div class="sub-item-title">Package Includes:</div>
              </td>
            </tr>
          `;
          item.bundlePerks.forEach((perk) => {
            html += `
              <tr>
                <td colspan="4" class="sub-item-cell perk-item">
                  - ${perk}
                </td>
              </tr>
            `;
          });
        }

        if (item.bundleAllocations) {
          html += `
            <tr>
              <td colspan="4" class="sub-item-cell">
                <div class="sub-item-title" style="margin-top: 8px;">Allocated Items:</div>
              </td>
            </tr>
          `;
          if (item.bundleAllocations.booth) {
            html += `
              <tr>
                <td colspan="4" class="sub-item-cell perk-item">
                  - Booth: ${item.bundleAllocations.booth.name} (${item.bundleAllocations.booth.tier})
                </td>
              </tr>
            `;
          }
          if (item.bundleAllocations.masterclass) {
            html += `
              <tr>
                <td colspan="4" class="sub-item-cell perk-item">
                  - Masterclass: ${item.bundleAllocations.masterclass.title} (${item.bundleAllocations.masterclass.duration}, ${item.bundleAllocations.masterclass.day})
                </td>
              </tr>
            `;
          }
          if (item.bundleAllocations.presentation) {
            html += `
              <tr>
                <td colspan="4" class="sub-item-cell perk-item">
                  - Presentation: ${item.bundleAllocations.presentation.title} (${item.bundleAllocations.presentation.duration}, ${item.bundleAllocations.presentation.day})
                </td>
              </tr>
            `;
          }
          if (item.bundleAllocations.advertSlots) {
            item.bundleAllocations.advertSlots.forEach((slot) => {
              html += `
                <tr>
                  <td colspan="4" class="sub-item-cell perk-item">
                    - Ad Slot: ${slot.title}
                  </td>
                </tr>
              `;
            });
          }
          if (item.bundleAllocations.brandingSlots) {
            item.bundleAllocations.brandingSlots.forEach((slot) => {
              html += `
                <tr>
                  <td colspan="4" class="sub-item-cell perk-item">
                    - Branding Slot: ${slot.title}
                  </td>
                </tr>
              `;
            });
          }
        }

        // Add a spacer row to close the item group with a border
        if (hasSubItems) {
          html += `
            <tr class="spacer-row">
              <td colspan="4"></td>
            </tr>
          `;
        }

        return html;
      })
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${receipt.reference}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #333333;
      background-color: #ffffff;
      margin: 0;
      padding: 40px 20px;
    }
    
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 40px;
      border: 1px solid #e0e0e0;
    }
    
    .receipt-header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: 20px;
    }
    
    .receipt-header h1 {
      font-size: 24px;
      color: #2c3e50;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .receipt-header h2 {
      font-size: 18px;
      color: #34495e;
      margin: 0 0 12px 0;
      font-weight: normal;
    }
    
    .receipt-header h3 {
      font-size: 14px;
      color: #7f8c8d;
      margin: 0;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .receipt-info {
      display: table;
      width: 100%;
      margin-bottom: 30px;
    }
    
    .info-section {
      display: table-cell;
      width: 50%;
      vertical-align: top;
    }
    
    .info-section h4 {
      font-size: 14px;
      color: #2c3e50;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
      display: inline-block;
    }
    
    .info-row {
      margin-bottom: 6px;
      font-size: 13px;
    }
    
    .info-label {
      font-weight: bold;
      color: #555555;
      display: inline-block;
      width: 120px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      font-size: 13px;
    }
    
    .items-table th {
      background-color: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: bold;
      color: #2c3e50;
      border-top: 1px solid #2c3e50;
      border-bottom: 1px solid #2c3e50;
      text-transform: uppercase;
    }
    
    .items-table th.center {
      text-align: center;
    }
    
    .items-table th.right {
      text-align: right;
    }
    
    .item-cell {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .item-cell.no-border {
      border-bottom: none;
    }
    
    .item-cell.center {
      text-align: center;
    }
    
    .item-cell.right {
      text-align: right;
    }
    
    .sub-item-cell {
      padding: 2px 12px 2px 24px;
      border: none;
      color: #555555;
    }
    
    .sub-item-title {
      font-weight: bold;
      font-size: 12px;
      margin-top: 4px;
      color: #2c3e50;
    }
    
    .perk-item {
      font-size: 12px;
      padding-left: 36px;
    }
    
    /* Remove border from the last sub-item if it's the last row of the group, 
       or just rely on the main item having the border. We'll add a spacer row for cleanliness */
    .spacer-row td {
      padding: 0;
      height: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .totals {
      width: 350px;
      float: right;
      margin-top: 10px;
    }
    
    .totals-row {
      display: table;
      width: 100%;
      padding: 8px 0;
      font-size: 13px;
    }
    
    .totals-label {
      display: table-cell;
      text-align: right;
      padding-right: 20px;
      color: #555555;
    }
    
    .totals-value {
      display: table-cell;
      text-align: right;
      width: 120px;
    }
    
    .totals-row.total {
      border-top: 2px solid #2c3e50;
      font-weight: bold;
      font-size: 16px;
      color: #2c3e50;
      margin-top: 4px;
      padding-top: 12px;
    }
    
    .clearfix::after {
      content: "";
      clear: both;
      display: table;
    }
    
    .receipt-footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
    }
    
    .receipt-footer p {
      margin: 4px 0;
    }
    
    @media print {
      body {
        padding: 0;
        background-color: #ffffff;
      }
      .receipt-container {
        border: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1>Association of Nigerian Private Medical Practitioners</h1>
      <h2>Annual General Meeting & Scientific Conference</h2>
      <h3>Official Receipt</h3>
    </div>
    
    <div class="receipt-info">
      <div class="info-section">
        <h4>Receipt Details</h4>
        <div class="info-row">
          <span class="info-label">Receipt No:</span>
          <span>${receipt.reference}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment ID:</span>
          <span>${receipt.id}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span>${formatDate(receipt.paidAt || receipt.createdAt)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Status:</span>
          <span style="text-transform: uppercase; font-weight: bold; color: ${receipt.status === 'success' ? '#27ae60' : '#e74c3c'}">${receipt.status}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Payment Method:</span>
          <span style="text-transform: capitalize;">${receipt.provider}</span>
        </div>
      </div>
      
      <div class="info-section">
        <h4>Billed To</h4>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span>${receipt.user.email}</span>
        </div>
        ${receipt.user.name ? `
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span>${receipt.user.name}</span>
        </div>` : ''}
        <div class="info-row">
          <span class="info-label">Account Type:</span>
          <span style="text-transform: capitalize;">${receipt.user.regType}</span>
        </div>
        ${receipt.company ? `
        <div class="info-row">
          <span class="info-label">Company:</span>
          <span>${receipt.company.companyName}</span>
        </div>` : ''}
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="center" style="width: 80px;">Qty</th>
          <th class="right" style="width: 120px;">Unit Price</th>
          <th class="right" style="width: 120px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="clearfix">
      <div class="totals">
        <div class="totals-row">
          <div class="totals-label">Subtotal:</div>
          <div class="totals-value">${formatCurrency(receipt.baseAmountKobo)}</div>
        </div>
        <div class="totals-row">
          <div class="totals-label">Transaction Fee:</div>
          <div class="totals-value">${formatCurrency(receipt.totalAmountKobo - receipt.baseAmountKobo)}</div>
        </div>
        <div class="totals-row total">
          <div class="totals-label" style="color: #2c3e50;">Total Paid:</div>
          <div class="totals-value">${formatCurrency(receipt.totalAmountKobo)}</div>
        </div>
      </div>
    </div>
    
    <div class="receipt-footer">
      <p>Thank you for your payment.</p>
      <p>This is an official receipt generated by the Association of Nigerian Private Medical Practitioners.</p>
      <p>For inquiries, please contact support@anpmplagos.com</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
