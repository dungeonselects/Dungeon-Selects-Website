(() => {
  const dialog = document.querySelector('#plan-dialog');
  const selectedPlan = dialog.querySelector('#plan-dialog-name');
  const selectedPrice = dialog.querySelector('#plan-dialog-price');
  const tier = dialog.querySelector('.plan-dialog-tier');

  for (const button of document.querySelectorAll('[data-plan]')) {
    button.addEventListener('click', (event) => {
      if (typeof dialog.showModal !== 'function') return;
      event.preventDefault();

      const card = button.closest('.plan-card');
      const title = card.querySelector('h3');
      dialog.dataset.tier = button.dataset.plan;
      selectedPlan.dataset.copy = title.dataset.copy;
      selectedPlan.textContent = title.textContent;
      selectedPrice.textContent = card.querySelector('.plan-amount').textContent;
      tier.hidden = false;
      if (!dialog.open) dialog.showModal();
    });
  }
})();
