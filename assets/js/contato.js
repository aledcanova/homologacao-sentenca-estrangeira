(function () {
  var c = window.SITE_CONFIG || {};
  if (!c.whatsapp_e164) return;
  var card = document.getElementById('card-whatsapp'), a = document.getElementById('link-whatsapp');
  a.href = 'https://wa.me/' + c.whatsapp_e164.replace(/\D/g, '');
  a.textContent = c.whatsapp_exibicao || c.whatsapp_e164;
  card.hidden = false;
})();
