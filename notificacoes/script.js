
const listaNotificacoes = document.getElementById("listaNotificacoes");
const filtroNotificacoes = document.getElementById("filtroNotificacoes");
const filtroLeitura = document.getElementById("filtroLeitura");
const totalNotificacoes = document.getElementById("totalNotificacoes");
const totalNaoLidas = document.getElementById("totalNaoLidas");
const totalLidas = document.getElementById("totalLidas");
const contadorMenu = document.getElementById("contadorMenu");
const contadorResultados = document.getElementById("contadorResultados");
const marcarTodasLidas = document.getElementById("marcarTodasLidas");

let usuarioAtual = null;
let notificacoes = [];
let carregando = false;

function escaparHTML(valor = "") {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function formatarDataHora(valor) {
    if (!valor) return "Data não informada";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "Data não informada";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function obterIniciais(nome) {
    return (nome || "Cliente")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(parte => parte[0])
        .join("")
        .toUpperCase();
}

function atualizarIndicadores() {
    const naoLidas = notificacoes.filter(item => !item.read_at).length;
    const lidas = notificacoes.length - naoLidas;

    totalNotificacoes.textContent = notificacoes.length;
    totalNaoLidas.textContent = naoLidas;
    totalLidas.textContent = lidas;

    contadorMenu.textContent = naoLidas;
    contadorMenu.hidden = naoLidas === 0;

    marcarTodasLidas.disabled = carregando || naoLidas === 0;
}

function obterNotificacoesFiltradas() {
    const busca = filtroNotificacoes.value.trim().toLocaleLowerCase("pt-BR");
    const situacao = filtroLeitura.value;

    return notificacoes.filter(item => {
        const texto = `${item.title || ""} ${item.message || ""}`
            .toLocaleLowerCase("pt-BR");

        const correspondeBusca = texto.includes(busca);
        const correspondeSituacao =
            situacao === "todas" ||
            (situacao === "nao-lidas" && !item.read_at) ||
            (situacao === "lidas" && Boolean(item.read_at));

        return correspondeBusca && correspondeSituacao;
    });
}

function renderizarNotificacoes() {
    atualizarIndicadores();

    const filtradas = obterNotificacoesFiltradas();

    contadorResultados.textContent =
        `${filtradas.length} ${filtradas.length === 1 ? "notificação encontrada" : "notificações encontradas"}`;

    if (!filtradas.length) {
        const existemNotificacoes = notificacoes.length > 0;

        listaNotificacoes.innerHTML = `
            <div class="resultado-vazio notificacoes-vazio">
                <div class="resultado-vazio-icone">
                    <i data-lucide="${existemNotificacoes ? "search-x" : "bell-off"}" class="icone"></i>
                </div>
                <h3>${existemNotificacoes ? "Nenhum resultado encontrado" : "Nenhuma atualização para seus voos"}</h3>
                <p>${existemNotificacoes ? "Tente alterar os filtros para encontrar uma notificação." : "Quando houver uma atualização de ocorrência relacionada a um dos seus voos acompanhados, ela aparecerá aqui."}</p>
            </div>
        `;

        if (window.lucide) lucide.createIcons();
        return;
    }

    listaNotificacoes.innerHTML = filtradas.map(item => `
        <article class="notificacao-card ${item.read_at ? "notificacao-lida" : "notificacao-nao-lida"}">
            <div class="notificacao-card-icone ${item.read_at ? "notificacao-icone-lida" : "notificacao-icone-pendente"}">
                <i data-lucide="${item.read_at ? "check-check" : "bell-ring"}" class="icone"></i>
            </div>

            <div class="notificacao-card-conteudo">
                <div class="notificacao-card-titulo">
                    <h3>${escaparHTML(item.title || "Atualização do voo")}</h3>
                    ${item.read_at
                        ? '<span class="notificacao-status lida">Lida</span>'
                        : '<span class="notificacao-status pendente">Não lida</span>'}
                </div>

                <p>${escaparHTML(item.message || "Não há detalhes adicionais para esta atualização.")}</p>

                <time datetime="${escaparHTML(item.created_at || "")}">
                    <i data-lucide="clock-3" class="icone"></i>
                    ${escaparHTML(formatarDataHora(item.created_at))}
                </time>
            </div>

            ${item.read_at ? "" : `
                <button type="button" class="notificacao-marcar-lida" data-notificacao-id="${escaparHTML(item.id)}" aria-label="Marcar ${escaparHTML(item.title || "notificação")} como lida" title="Marcar como lida">
                    <i data-lucide="check" class="icone"></i>
                    <span>Marcar como lida</span>
                </button>
            `}
        </article>
    `).join("");

    if (window.lucide) lucide.createIcons();
}

async function marcarComoLida(id) {
    if (carregando || !usuarioAtual) return;

    const notificacao = notificacoes.find(item => item.id === id);

    if (!notificacao || notificacao.read_at) return;

    carregando = true;
    atualizarIndicadores();

    const dataLeitura = new Date().toISOString();

    const { data, error } = await supabaseClient
        .from("notifications")
        .update({ read_at: dataLeitura })
        .eq("id", id)
        .eq("user_id", usuarioAtual.id)
        .not("source_update_id", "is", null)
        .is("read_at", null)
        .select("id, read_at")
        .maybeSingle();

    carregando = false;

    if (error) {
        alert("Não foi possível marcar a atualização como lida. Verifique as permissões da tabela no Supabase.");
        atualizarIndicadores();
        return;
    }

    if (data) {
        notificacao.read_at = data.read_at;
    }

    renderizarNotificacoes();
}

async function marcarTodasComoLidas() {
    if (carregando || !usuarioAtual || !notificacoes.some(item => !item.read_at)) return;

    carregando = true;
    atualizarIndicadores();

    const dataLeitura = new Date().toISOString();

    const { data, error } = await supabaseClient
        .from("notifications")
        .update({ read_at: dataLeitura })
        .eq("user_id", usuarioAtual.id)
        .not("source_update_id", "is", null)
        .is("read_at", null)
        .select("id, read_at");

    carregando = false;

    if (error) {
        alert("Não foi possível atualizar as notificações. Verifique as permissões da tabela no Supabase.");
        atualizarIndicadores();
        return;
    }

    const atualizadas = new Map((data || []).map(item => [item.id, item.read_at]));

    notificacoes = notificacoes.map(item => {
        if (atualizadas.has(item.id)) {
            return { ...item, read_at: atualizadas.get(item.id) };
        }

        return item;
    });

    renderizarNotificacoes();
}

async function carregarNotificacoes() {
    if (!window.supabaseClient) {
        listaNotificacoes.innerHTML = `
            <div class="resultado-vazio">
                <h3>Conexão indisponível</h3>
                <p>Não foi possível iniciar a conexão com o Supabase.</p>
            </div>
        `;
        return;
    }

    const { data: sessao, error: erroSessao } =
        await supabaseClient.auth.getSession();

    if (erroSessao || !sessao.session?.user) {
        window.location.href = "../landingPage/index.html";
        return;
    }

    usuarioAtual = sessao.session.user;

    const nome =
        usuarioAtual.user_metadata?.full_name ||
        usuarioAtual.user_metadata?.nome_completo ||
        usuarioAtual.email?.split("@")[0] ||
        "Cliente";

    document.getElementById("nomeCliente").textContent = nome;
    document.getElementById("avatarCliente").textContent = obterIniciais(nome);

    const { data, error } = await supabaseClient
        .from("notifications")
        .select("id, title, message, read_at, created_at, source_update_id")
        .eq("user_id", usuarioAtual.id)
        .not("source_update_id", "is", null)
        .order("created_at", { ascending: false });

    if (error) {
        listaNotificacoes.innerHTML = `
            <div class="resultado-vazio">
                <h3>Não foi possível carregar as notificações</h3>
                <p>Verifique sua conexão e as permissões de acesso no Supabase.</p>
                <button type="button" class="botao-principal" id="tentarCarregarNovamente">Tentar novamente</button>
            </div>
        `;

        document.getElementById("tentarCarregarNovamente")
            ?.addEventListener("click", carregarNotificacoes);

        return;
    }

    notificacoes = data || [];
    renderizarNotificacoes();
}

filtroNotificacoes.addEventListener("input", renderizarNotificacoes);
filtroLeitura.addEventListener("change", renderizarNotificacoes);
marcarTodasLidas.addEventListener("click", marcarTodasComoLidas);

listaNotificacoes.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-notificacao-id]");

    if (botao) {
        marcarComoLida(botao.dataset.notificacaoId);
    }
});

document.getElementById("limparFiltros").addEventListener("click", () => {
    filtroNotificacoes.value = "";
    filtroLeitura.value = "todas";
    renderizarNotificacoes();
});

document.addEventListener("DOMContentLoaded", () => {
    if (window.lucide) lucide.createIcons();
    carregarNotificacoes();
});
