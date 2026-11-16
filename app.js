const sessionState = {
  income: 6500000,
  expense: 3050000,
  budget: 5000000,
  recent: [],
  chartMode: 'bars'
};

const money = (value) => `${new Intl.NumberFormat('vi-VN').format(Math.round(value))} đ`;
const amountFrom = (modal) => Number(modal.querySelector('input[type="number"]')?.value || 0);
const textFrom = (modal, index) => modal.querySelectorAll('input')[index]?.value?.trim() || 'Khoản mới';
const selectFrom = (modal, index) => modal.querySelectorAll('select')[index]?.value || '';

function toast(message) {
  let node = document.querySelector('.toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.classList.add('show');
  window.clearTimeout(node.timer);
  node.timer = window.setTimeout(() => node.classList.remove('show'), 2600);
}

function updateSummary() {
  const balance = sessionState.income - sessionState.expense;
  const remaining = Math.max(sessionState.budget - sessionState.expense, 0);
  document.querySelector('[data-role="balance"]')?.replaceChildren(document.createTextNode(money(balance)));
  document.querySelector('[data-role="income-total"]')?.replaceChildren(document.createTextNode(`+${money(sessionState.income)}`));
  document.querySelector('[data-role="expense-total"]')?.replaceChildren(document.createTextNode(`-${money(sessionState.expense)}`));
  document.querySelector('[data-role="budget-remaining"]')?.replaceChildren(document.createTextNode(`Còn lại ${money(remaining)}`));
}

function addRecentItem(label, detail, value, isIncome) {
  const target = document.querySelector('#recent-transactions');
  if (!target) return;
  const row = document.createElement('div');
  row.className = 'list-row session-row';
  row.innerHTML = `<span><strong>${label}</strong><small>${detail}</small></span><b class="amount${isIncome ? ' green' : ''}">${isIncome ? '+' : '-'}${money(value)}</b>`;
  target.prepend(row);
  while (target.children.length > 5) target.lastElementChild.remove();
}

function appendIncomeRow(label, amount, wallet) {
  const body = document.querySelector('table tbody');
  if (!body || !location.pathname.endsWith('income.html')) return;
  const row = document.createElement('tr');
  row.className = 'session-row';
  row.innerHTML = `<td>Hôm nay • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td><span class="pill green">Khoản mới</span></td><td><strong>${label}</strong></td><td>${wallet}</td><td class="amount green">+${money(amount)}</td>`;
  body.prepend(row);
}

function appendExpenseRow(label, amount, category) {
  const body = document.querySelector('table tbody');
  if (!body || !location.pathname.endsWith('transactions.html')) return;
  const row = document.createElement('tr');
  row.className = 'session-row';
  row.innerHTML = `<td>Hôm nay • ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td><span class="pill">Khoản mới</span></td><td><strong>${label}</strong></td><td>Tiền mặt</td><td>-${money(amount)}</td>`;
  body.prepend(row);
}

function renderChart(mode = sessionState.chartMode) {
  const chart = document.querySelector('#cashflow-chart');
  if (!chart) return;
  sessionState.chartMode = mode;
  const sets = {
    bars: { labels: ['Thg 6', 'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11'], income: [5.6, 6, 5.5, 7.2, 6.2, sessionState.income / 1000000], expense: [4.5, 4.9, 4.1, 5.8, 4.3, sessionState.expense / 1000000] },
    daily: { labels: ['01', '05', '09', '13', '17', 'Hôm nay'], income: [0, 4, 0, 2.5, 0, sessionState.income / 1000000], expense: [0.35, 1.5, 0.6, 0.17, 0.22, sessionState.expense / 1000000] }
  };
  if (mode === 'line') {
    const data = sets.bars;
    const max = 8;
    const points = (values) => values.map((value, index) => `${index * 20 + 10},${100 - (value / max) * 84}`).join(' ');
    chart.className = 'line-chart';
    chart.innerHTML = `<svg viewBox="0 0 120 100" preserveAspectRatio="none" aria-label="Biểu đồ đường dòng tiền"><path class="line-grid" d="M0 16H120 M0 42H120 M0 68H120 M0 94H120"></path><polyline class="income-line" points="${points(data.income)}"></polyline><polyline class="expense-line" points="${points(data.expense)}"></polyline></svg><div class="line-labels">${data.labels.map((label) => `<span>${label}</span>`).join('')}</div>`;
  } else {
    const data = sets[mode] || sets.bars;
    const max = Math.max(...data.income, ...data.expense, 1);
    chart.className = 'chart';
    chart.innerHTML = data.labels.map((label, index) => `<div class="bar-group"><i class="bar" style="height:${(data.income[index] / max) * 90}%"></i><i class="bar blue" style="height:${(data.expense[index] / max) * 90}%"></i><small class="bar-label">${label}</small></div>`).join('');
  }
  document.querySelectorAll('[data-chart-mode]').forEach((button) => button.classList.toggle('active', button.dataset.chartMode === mode));
}

function processModal(modal) {
  const value = amountFrom(modal);
  if (!value || value < 0) {
    toast('Vui lòng nhập số tiền hợp lệ.');
    return false;
  }
  if (modal.id === 'income-modal') {
    const label = textFrom(modal, 0);
    const wallet = selectFrom(modal, 0);
    sessionState.income += value;
    addRecentItem(`▣ ${label}`, `Thu nhập • ${wallet} • Vừa thêm`, value, true);
    appendIncomeRow(label, value, wallet);
    toast(`Đã thêm khoản thu ${money(value)} (chỉ lưu trong phiên này).`);
  } else if (modal.id === 'expense-modal') {
    const label = textFrom(modal, 0);
    const category = selectFrom(modal, 0);
    sessionState.expense += value;
    addRecentItem(`• ${label}`, `${category} • Tiền mặt • Vừa thêm`, value, false);
    appendExpenseRow(label, value, category);
    toast(`Đã thêm khoản chi ${money(value)} (chỉ lưu trong phiên này).`);
  } else if (modal.id === 'saving-modal') {
    toast(`Đã nạp ${money(value)} vào quỹ tạm thời. Sau khi tải lại sẽ khôi phục dữ liệu mẫu.`);
  } else if (modal.id === 'debt-modal') {
    toast(`Đã thêm khoản vay/mượn ${money(value)} vào phiên hiện tại.`);
  }
  updateSummary();
  renderChart();
  return true;
}

document.querySelectorAll('[data-open-modal]').forEach((button) => {
  button.addEventListener('click', () => {
    const modal = document.querySelector(button.dataset.openModal);
    if (modal) modal.classList.add('open');
  });
});

document.querySelectorAll('[data-close-modal]').forEach((button) => {
  button.addEventListener('click', (event) => {
    const modal = button.closest('.modal-backdrop');
    if (button.classList.contains('btn')) {
      if (!processModal(modal)) {
        event.preventDefault();
        return;
      }
    }
    modal?.classList.remove('open');
  });
});

document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) backdrop.classList.remove('open');
  });
});

document.querySelectorAll('[data-chart-mode]').forEach((button) => {
  button.addEventListener('click', () => renderChart(button.dataset.chartMode));
});

updateSummary();
renderChart();
