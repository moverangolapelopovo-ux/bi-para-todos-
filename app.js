
const CAMPAIGN_URL = window.location.href.split('#')[0];
const BASELINE = 0; // Substitua apenas por assinaturas reais e verificadas.
const GOAL = 100000;

const stored = JSON.parse(localStorage.getItem('biPetitionDemo') || '[]');
const total = BASELINE + stored.length;
document.getElementById('totalSignatures').textContent = total.toLocaleString('pt-PT');
document.getElementById('todaySignatures').textContent = stored.length.toLocaleString('pt-PT');
document.getElementById('goal').textContent = GOAL.toLocaleString('pt-PT');
const pct = Math.min(100, (total / GOAL) * 100);
document.getElementById('percent').textContent = pct.toFixed(2).replace('.', ',') + '%';
document.getElementById('progressBar').style.width = pct + '%';
document.getElementById('year').textContent = new Date().getFullYear();

const shareText = encodeURIComponent('O Bilhete de Identidade é um direito, não um privilégio. Assine a petição: ');
document.getElementById('whatsapp').href = `https://wa.me/?text=${shareText}${encodeURIComponent(CAMPAIGN_URL)}`;

document.getElementById('copyLink').addEventListener('click', async () => {
  await navigator.clipboard.writeText(CAMPAIGN_URL);
  document.getElementById('copyLink').textContent = 'Link copiado';
});

document.getElementById('petitionForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim().toLowerCase();
  if (stored.some(s => s.email === email)) {
    document.getElementById('formMessage').textContent = 'Este email já foi utilizado nesta demonstração.';
    return;
  }
  stored.push({
    name: document.getElementById('name').value.trim(),
    province: document.getElementById('province').value,
    email,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem('biPetitionDemo', JSON.stringify(stored));
  document.getElementById('formMessage').textContent = 'Assinatura registada nesta demonstração. Para uma campanha real, ligue a página a uma base de dados e validação por email.';
  setTimeout(() => location.reload(), 1200);
});
