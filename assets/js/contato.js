// Mostra WhatsApp e LinkedIn quando estão preenchidos em config.json.
(function () {
  var c = window.SITE_CONFIG || {};
  function ligar(id, href, texto) {
    var a = document.getElementById(id);
    if (!a || !href) return;
    a.href = href;
    if (texto) document.getElementById('texto-whatsapp').textContent = texto;
    a.hidden = false;
  }
  if (c.whatsapp_e164) ligar('canal-whatsapp', 'https://wa.me/' + c.whatsapp_e164.replace(/\D/g, ''), c.whatsapp_exibicao || c.whatsapp_e164);
  if (c.linkedin_url) ligar('canal-linkedin', c.linkedin_url);
})();
