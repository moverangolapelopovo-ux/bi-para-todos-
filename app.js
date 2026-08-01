(() => {
  "use strict";

  const GOAL = 100000;
  const cfg = window.BI_CONFIG || {};
  const msg = document.getElementById("formMessage");
  const btn = document.getElementById("submitButton");
  const form = document.getElementById("petitionForm");
  const publicUrl = location.href.split("#")[0].split("?")[0];

  let lastTotal = 0;

  function show(text, type = "") {
    msg.textContent = text;
    msg.className = `message ${type}`.trim();
  }

  if (
    !window.supabase ||
    !cfg.supabaseUrl ||
    !cfg.supabasePublishableKey ||
    cfg.supabasePublishableKey.includes("COLE_AQUI")
  ) {
    show("A ligação à base de dados ainda não foi configurada.", "error");
    btn.disabled = true;
    return;
  }

  const client = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabasePublishableKey
  );

  const format = value => Number(value || 0).toLocaleString("pt-PT");

  const escapeHtml = value => {
    const element = document.createElement("div");
    element.textContent = String(value ?? "");
    return element.innerHTML;
  };

  function animateNumber(element, from, to) {
    if (from === to) {
      element.textContent = format(to);
      return;
    }

    const duration = 650;
    const startedAt = performance.now();

    function frame(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (to - from) * eased);
      element.textContent = format(value);

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  function setLiveStatus(text, connected = true) {
    const status = document.getElementById("liveStatus");
    const dot = document.querySelector(".live-dot");
    status.textContent = text;
    dot.classList.toggle("offline", !connected);
  }

  async function loadStats() {
    const { data, error } = await client.rpc("obter_estatisticas_assinaturas");

    if (error) {
      console.error(error);
      document.getElementById("provinceStats").innerHTML =
        "<p>Não foi possível carregar as estatísticas.</p>";
      setLiveStatus("A tentar restabelecer a atualização", false);
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;
    const total = Number(result?.total || 0);
    const today = Number(result?.hoje || 0);
    const rows = result?.por_provincia || [];

    const totalElement = document.getElementById("totalCount");
    animateNumber(totalElement, lastTotal, total);
    lastTotal = total;

    document.getElementById("todayCount").textContent = format(today);

    const percentage = Math.min(100, (total / GOAL) * 100);
    document.getElementById("progressPercent").textContent =
      percentage.toFixed(2).replace(".", ",") + "%";
    document.getElementById("progressBar").style.width = percentage + "%";

    const provinceStats = document.getElementById("provinceStats");

    if (!rows.length) {
      provinceStats.innerHTML = "<p>Ainda não existem assinaturas registadas.</p>";
      setLiveStatus("Contador atualizado agora");
      return;
    }

    const maximum = Math.max(...rows.map(row => Number(row.total || 0)), 1);

    provinceStats.innerHTML = rows.map(row => {
      const count = Number(row.total || 0);
      const width = Math.max(3, (count / maximum) * 100);

      return `
        <div class="province-row">
          <strong>${escapeHtml(row.provincia)}</strong>
          <div class="province-track">
            <div class="province-fill" style="width:${width}%"></div>
          </div>
          <span>${format(count)}</span>
        </div>`;
    }).join("");

    setLiveStatus("Contador atualizado agora");
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    show("");

    if (localStorage.getItem("bi_para_todos_assinado") === "sim") {
      show("Este dispositivo já registou uma assinatura.", "error");
      return;
    }

    const nome = document.getElementById("nome").value
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[<>]/g, "");
    const provincia = document.getElementById("provincia").value;
    const consentiu = document.getElementById("consentimento").checked;

    if (nome.length < 3 || !provincia || !consentiu) {
      show(
        "Preencha o nome, selecione a província e confirme a declaração.",
        "error"
      );
      return;
    }

    btn.disabled = true;
    btn.textContent = "A REGISTAR…";

    const { error } = await client
      .from("assinaturas")
      .insert({ nome, provincia });

    if (error) {
      console.error(error);
      show("Não foi possível registar a assinatura. Tente novamente.", "error");
      btn.disabled = false;
      btn.textContent = "ASSINAR A PETIÇÃO";
      return;
    }

    localStorage.setItem("bi_para_todos_assinado", "sim");
    form.reset();
    show("Obrigado! A sua assinatura foi registada com sucesso.", "success");
    btn.textContent = "ASSINATURA REGISTADA";
    await loadStats();
  });

  const shareText =
    "O Bilhete de Identidade é um direito, não um privilégio. " +
    "Assine a petição BI PARA TODOS:";

  document.getElementById("shareWhatsApp").href =
    `https://wa.me/?text=${encodeURIComponent(shareText + " " + publicUrl)}`;

  document.getElementById("shareFacebook").href =
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`;

  document.getElementById("shareX").href =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicUrl)}`;

  document.getElementById("shareTelegram").href =
    `https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(shareText)}`;

  document.getElementById("copyLink").addEventListener("click", async () => {
    const button = document.getElementById("copyLink");

    try {
      await navigator.clipboard.writeText(publicUrl);
      button.textContent = "Ligação copiada";
      setTimeout(() => button.textContent = "Copiar ligação", 1800);
    } catch {
      prompt("Copie esta ligação:", publicUrl);
    }
  });

  // Atualização verdadeiramente em tempo real através do Supabase Realtime.
  const channel = client
    .channel("assinaturas-publicas")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "assinaturas"
      },
      () => loadStats()
    )
    .subscribe(status => {
      if (status === "SUBSCRIBED") {
        setLiveStatus("Contador ligado em tempo real");
      } else if (
        status === "CHANNEL_ERROR" ||
        status === "TIMED_OUT" ||
        status === "CLOSED"
      ) {
        setLiveStatus("Atualização automática por intervalo", false);
      }
    });

  // Salvaguarda: atualiza a cada 30 segundos, mesmo se o Realtime falhar.
  loadStats();
  setInterval(loadStats, 30000);

  window.addEventListener("beforeunload", () => {
    client.removeChannel(channel);
  });
})();