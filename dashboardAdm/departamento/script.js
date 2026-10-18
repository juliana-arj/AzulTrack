
const clienteSupabase = window.supabaseClient;
const caminhoLogin = "../../login/index.html";

const CONFIG = {
    tabelaOcorrencias: "operational_occurrences",
    tabelaAtualizacoes: "occurrence_updates",
    tabelaPerfis: "profiles",
    tabelaDepartamentos: "departments",
    tabelaNotificacoes: "notifications",
    tabelaTransferencias: "occurrence_transfers"
};

const $ = id => document.getElementById(id);

let usuarioAtual = null;
let perfilAtual = null;
let departamentoAtual = null;
let departamentoId = null;
let ocorrenciasCarregadas = [];
let perfisCarregados = [];
let departamentosCarregados = [];
let todasPendencias = {
    recebidas: [],
    enviadas: []
};
let abaPendenciasAtual = "recebidas";
let intervaloAtualizacao = null;

const departamentos = {
    atendimento: {
        nome: "Atendimento",
        descricao: "Acompanhe solicitações, atendimentos e pendências que exigem retorno da equipe.",
        indicadores: [
            "Solicitações em acompanhamento",
            "Interações com outros setores",
            "Demandas recentes"
        ]
    },
    cco: {
        nome: "CCO",
        descricao: "Acompanhe ocorrências operacionais, prioridades e dependências entre departamentos.",
        indicadores: [
            "Ocorrências operacionais",
            "Demandas interdepartamentais",
            "Atividades recentes"
        ]
    },
    comercial: {
        nome: "Comercial",
        descricao: "Acompanhe demandas comerciais, solicitações e processos que dependem de outras equipes.",
        indicadores: [
            "Demandas comerciais",
            "Solicitações interdepartamentais",
            "Atividades recentes"
        ]
    },
    handling: {
        nome: "Handling",
        descricao: "Acompanhe pendências de solo, solicitações operacionais e comunicação com outras equipes.",
        indicadores: [
            "Demandas de solo",
            "Solicitações interdepartamentais",
            "Atividades recentes"
        ]
    },
    manutencao: {
        nome: "Manutenção",
        descricao: "Acompanhe ocorrências técnicas, solicitações de manutenção e pendências operacionais.",
        indicadores: [
            "Demandas técnicas",
            "Solicitações interdepartamentais",
            "Atividades recentes"
        ]
    },
    operacoes: {
        nome: "Operações",
        descricao: "Acompanhe ocorrências operacionais e demandas que exigem coordenação entre equipes.",
        indicadores: [
            "Ocorrências operacionais",
            "Demandas interdepartamentais",
            "Atividades recentes"
        ]
    },
    comunicacao: {
        nome: "Comunicação",
        descricao: "Acompanhe atualizações operacionais e informações relevantes para a comunicação com passageiros.",
        indicadores: [
            "Demandas de comunicação",
            "Solicitações interdepartamentais",
            "Atividades recentes"
        ]
    },
    gestao: {
        nome: "Gestão",
        descricao: "Acompanhe ocorrências, indicadores e demandas que dependem de coordenação administrativa.",
        indicadores: [
            "Demandas em acompanhamento",
            "Interações entre departamentos",
            "Atividades recentes"
        ]
    }
};

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "");
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caractere]);
}

function formatarData(valor) {
    if (!valor) return "Sem data";

    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) return "Sem data";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function obterStatus(status) {
    const valor = normalizarTexto(status);

    if ([
        "resolvida",
        "resolvido",
        "concluida",
        "concluido",
        "fechada",
        "fechado"
    ].includes(valor)) {
        return "resolvida";
    }

    if ([
        "emandamento",
        "emprogresso",
        "emexecucao",
        "andamento"
    ].includes(valor)) {
        return "andamento";
    }

    if ([
        "aberta",
        "aberto",
        "pendente",
        "nova",
        "novo"
    ].includes(valor)) {
        return "aberta";
    }

    return "outro";
}

function obterPrioridade(prioridade) {
    const valor = normalizarTexto(prioridade);

    if (["alta", "critica", "critico", "urgente"].includes(valor)) {
        return "alta";
    }

    if (["media", "moderada"].includes(valor)) {
        return "media";
    }

    if (["baixa", "normal"].includes(valor)) {
        return "baixa";
    }

    return "";
}

function nomeStatus(status) {
    const valor = obterStatus(status);

    if (valor === "resolvida") return "Resolvida";
    if (valor === "andamento") return "Em andamento";
    if (valor === "aberta") return "Aberta";

    return status || "Não informado";
}

function obterNomeDepartamento(departamento) {
    if (!departamento) return "Departamento não identificado";

    if (typeof departamento === "string") {
        const encontrado = departamentosCarregados.find(item =>
            item.id === departamento
        );

        return encontrado?.name || departamento;
    }

    return departamento.name || departamento.nome || "Departamento";
}

function obterNomeDepartamentoPorId(id) {
    if (!id) return "Não informado";

    const departamento = departamentosCarregados.find(item =>
        item.id === id
    );

    return departamento?.name || id;
}

function obterPerfilPorId(id) {
    return perfisCarregados.find(perfil => perfil.id === id) || null;
}

function obterIniciais(nome) {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!partes.length) return "--";

    const primeiroNome = partes[0][0];
    const ultimoSobrenome = partes.length > 1
        ? partes[partes.length - 1][0]
        : "";

    return `${primeiroNome}${ultimoSobrenome}`.toUpperCase();
}

function atualizarIcones() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function mostrarMensagem(mensagem, erro = false) {
    let elemento = $("mensagemDepartamento");

    if (!elemento) {
        elemento = document.createElement("div");
        elemento.id = "mensagemDepartamento";
        elemento.className = "departamento-mensagem";

        const principal = document.querySelector(".principal");

        if (principal) {
            principal.insertBefore(elemento, principal.children[1] || null);
        }
    }

    elemento.textContent = mensagem;
    elemento.classList.toggle("erro", erro);
    elemento.hidden = false;
}

function ocultarMensagem() {
    const elemento = $("mensagemDepartamento");

    if (elemento) {
        elemento.hidden = true;
    }
}

function atualizarPerfilVisual(nome, departamento) {
    const nomeExibicao = nome || "Usuário";
    const nomeDepartamento = obterNomeDepartamento(departamento);

    if ($("nomeUsuario")) {
        $("nomeUsuario").textContent = nomeExibicao;
    }

    if ($("departamentoUsuario")) {
        $("departamentoUsuario").textContent = nomeDepartamento;
    }

    if ($("avatarUsuario")) {
        $("avatarUsuario").textContent = obterIniciais(nomeExibicao);
    }
}

function personalizarDepartamento(id, nome) {
    const chave = normalizarTexto(id || nome);
    const departamento = departamentos[chave];

    if ($("nomeDepartamento")) {
        $("nomeDepartamento").textContent = nome || departamento?.nome || "Meu departamento";
    }

    if ($("descricaoDepartamento")) {
        $("descricaoDepartamento").textContent = departamento?.descricao ||
            "Acompanhe as atividades, ocorrências e solicitações da sua equipe.";
    }

    if ($("tituloIndicadoresEspecificos")) {
        $("tituloIndicadoresEspecificos").textContent =
            departamento ? `Indicadores de ${departamento.nome}` : "Indicadores do departamento";
    }

    const descricoes = departamento?.indicadores || [
        "Demandas em acompanhamento",
        "Interações com outros setores",
        "Demandas recentes"
    ];

    const icones = ["list-checks", "messages-square", "calendar-clock"];
    const container = $("indicadoresEspecificos");

    if (!container) return;

    container.innerHTML = descricoes.map((descricao, indice) => `
        <div class="departamento-especifico-item">
            <span class="departamento-especifico-icone">
                <i data-lucide="${icones[indice]}"></i>
            </span>
            <span class="departamento-especifico-label">${escaparHTML(descricao)}</span>
            <strong data-indicador-especifico="${indice}">—</strong>
        </div>
    `).join("");

    atualizarIcones();
}

async function carregarPerfil() {
    const { data: sessaoData, error: erroSessao } =
        await clienteSupabase.auth.getSession();

    if (erroSessao || !sessaoData?.session) {
        window.location.href = caminhoLogin;
        return false;
    }

    usuarioAtual = sessaoData.session.user;

    const { data: perfil, error: erroPerfil } = await clienteSupabase
        .from(CONFIG.tabelaPerfis)
        .select("id, display_name, role, department_id")
        .eq("id", usuarioAtual.id)
        .maybeSingle();

    if (erroPerfil || !perfil) {
        console.error("Erro ao carregar perfil:", erroPerfil);
        mostrarMensagem(
            "Não foi possível carregar seu perfil. Verifique as permissões da tabela profiles.",
            true
        );
        return false;
    }

    perfilAtual = perfil;
    departamentoId = perfil.department_id;

    if (departamentoId) {
        const { data: departamento, error: erroDepartamento } =
            await clienteSupabase
                .from(CONFIG.tabelaDepartamentos)
                .select("id, name")
                .eq("id", departamentoId)
                .maybeSingle();

        if (erroDepartamento) {
            console.error("Erro ao carregar departamento:", erroDepartamento);
            mostrarMensagem("Não foi possível consultar seu departamento.", true);
            return false;
        }

        departamentoAtual = departamento;
    }

    const nomeUsuario = perfil.display_name ||
        usuarioAtual.user_metadata?.display_name ||
        usuarioAtual.email?.split("@")[0] ||
        "Usuário";

    atualizarPerfilVisual(nomeUsuario, departamentoAtual);
    personalizarDepartamento(
        departamentoId,
        obterNomeDepartamento(departamentoAtual)
    );

    if (!departamentoId) {
        mostrarMensagem(
            "Sua conta não possui um departamento vinculado. Solicite ao administrador a associação de um departamento."
        );
        limparIndicadores();
        return true;
    }

    ocultarMensagem();
    return true;
}

function limparIndicadores() {
    [
        "totalAbertas",
        "totalRecebidas",
        "totalResolvidas",
        "totalEnviadas",
        "contadorRecebidas",
        "contadorEnviadas",
        "statusAbertas",
        "statusAndamento",
        "statusResolvidas"
    ].forEach(id => {
        if ($(id)) $(id).textContent = "0";
    });

    ["barraAbertas", "barraAndamento", "barraResolvidas"].forEach(id => {
        if ($(id)) $(id).style.width = "0%";
    });

    if ($("mensagemIndicadores")) {
        $("mensagemIndicadores").textContent =
            "Vincule um departamento ao seu perfil para consultar os indicadores.";
    }

    todasPendencias.recebidas = [];
    todasPendencias.enviadas = [];

    renderizarPendencias();
    renderizarAtividades([]);
    atualizarIndicadoresEspecificos([]);
}

async function carregarDepartamentos() {
    const { data, error } = await clienteSupabase
        .from(CONFIG.tabelaDepartamentos)
        .select("id, name");

    if (error) {
        console.error("Erro ao carregar departamentos:", error);
        departamentosCarregados = [];
        return;
    }

    departamentosCarregados = data || [];
}

async function consultarTransferencias() {
    const { data, error } = await clienteSupabase
        .from(CONFIG.tabelaTransferencias)
        .select(`
            id,
            occurrence_id,
            from_department_id,
            to_department_id,
            transferred_by,
            message,
            status,
            created_at,
            updated_at
        `)
        .order("created_at", { ascending: false })
        .limit(1000);

    if (error) {
        console.error("Erro ao consultar transferências:", error);
        throw error;
    }

    return data || [];
}

async function consultarOcorrencias() {
    if (!departamentoId) {
        limparIndicadores();
        return;
    }

    const { data, error } = await clienteSupabase
        .from(CONFIG.tabelaOcorrencias)
        .select(`
            id,
            occurrence_code,
            title,
            description,
            status,
            severity,
            responsible_department_id,
            created_by,
            created_at,
            updated_at,
            resolved_at
        `)
        .order("updated_at", { ascending: false })
        .limit(500);

    if (error) {
        console.error("Erro ao consultar ocorrências:", error);
        mostrarMensagem(
            "Não foi possível carregar as ocorrências. Verifique as permissões e as colunas da tabela operational_occurrences.",
            true
        );
        return;
    }

    ocorrenciasCarregadas = data || [];

    const idsCriadores = [
        ...new Set(
            ocorrenciasCarregadas
                .map(item => item.created_by)
                .filter(Boolean)
        )
    ];

    if (idsCriadores.length) {
        const { data: perfis, error: erroPerfis } = await clienteSupabase
            .from(CONFIG.tabelaPerfis)
            .select("id, display_name, department_id")
            .in("id", idsCriadores);

        if (erroPerfis) {
            console.error("Erro ao consultar perfis das ocorrências:", erroPerfis);
            perfisCarregados = [];
        } else {
            perfisCarregados = perfis || [];
        }
    } else {
        perfisCarregados = [];
    }


    const doDepartamento = ocorrenciasCarregadas.filter(item => {
        const perfilCriador = obterPerfilPorId(item.created_by);

        return item.responsible_department_id === departamentoId ||
            perfilCriador?.department_id === departamentoId;
    });

    const atribuidasAoDepartamento = ocorrenciasCarregadas.filter(item =>
        item.responsible_department_id === departamentoId
    );

    const abertas = atribuidasAoDepartamento.filter(item =>
        ["aberta", "andamento"].includes(obterStatus(item.status))
    );

    const abertasSemAndamento = atribuidasAoDepartamento.filter(item =>
        obterStatus(item.status) === "aberta"
    );

    const emAndamento = atribuidasAoDepartamento.filter(item =>
        obterStatus(item.status) === "andamento"
    );

    const resolvidas = atribuidasAoDepartamento.filter(item =>
        obterStatus(item.status) === "resolvida"
    );

    const transferencias = await consultarTransferencias();
    const ocorrenciasPorId = new Map(
        ocorrenciasCarregadas.map(item => [item.id, item])
    );

    const statusPendentes = ["pendente", "emandamento"];

    const transferenciasAtivas = transferencias.filter(transferencia => {
        const ocorrencia = ocorrenciasPorId.get(transferencia.occurrence_id);

        return ocorrencia &&
            obterStatus(ocorrencia.status) !== "resolvida" &&
            statusPendentes.includes(normalizarTexto(transferencia.status)) &&
            ocorrencia.responsible_department_id === transferencia.to_department_id;
    });

    const recebidas = transferenciasAtivas
        .filter(item => item.to_department_id === departamentoId)
        .map(item => ({
            ...ocorrenciasPorId.get(item.occurrence_id),
            transferencia: item
        }));

    const enviadas = transferenciasAtivas
        .filter(item => item.from_department_id === departamentoId)
        .map(item => ({
            ...ocorrenciasPorId.get(item.occurrence_id),
            transferencia: item
        }));

    if ($("totalAbertas")) $("totalAbertas").textContent = abertas.length;
    if ($("totalRecebidas")) $("totalRecebidas").textContent = recebidas.length;
    if ($("totalResolvidas")) $("totalResolvidas").textContent = resolvidas.length;
    if ($("totalEnviadas")) $("totalEnviadas").textContent = enviadas.length;

    if ($("contadorRecebidas")) $("contadorRecebidas").textContent = recebidas.length;
    if ($("contadorEnviadas")) $("contadorEnviadas").textContent = enviadas.length;

    if ($("statusAbertas")) $("statusAbertas").textContent = abertasSemAndamento.length;
    if ($("statusAndamento")) $("statusAndamento").textContent = emAndamento.length;
    if ($("statusResolvidas")) $("statusResolvidas").textContent = resolvidas.length;

    const total = atribuidasAoDepartamento.length;

    atualizarBarra("barraAbertas", abertasSemAndamento.length, total);
    atualizarBarra("barraAndamento", emAndamento.length, total);
    atualizarBarra("barraResolvidas", resolvidas.length, total);

    if ($("mensagemIndicadores")) {
        $("mensagemIndicadores").textContent =
            `${atribuidasAoDepartamento.length} ocorrência(s) atribuída(s) ao departamento.`;
    }

    todasPendencias.recebidas = recebidas;
    todasPendencias.enviadas = enviadas;

    let interacoesComOutrosSetores = 0;

    const idsOcorrencias = atribuidasAoDepartamento.map(item => item.id);

    if (idsOcorrencias.length) {
        const { data: atualizacoes, error: erroAtualizacoes } =
            await clienteSupabase
                .from(CONFIG.tabelaAtualizacoes)
                .select("occurrence_id, department_id")
                .in("occurrence_id", idsOcorrencias);

        if (erroAtualizacoes) {
            console.error("Erro ao consultar interações entre departamentos:", erroAtualizacoes);
        } else {
            interacoesComOutrosSetores = new Set(
                (atualizacoes || [])
                    .filter(item =>
                        item.department_id &&
                        item.department_id !== departamentoId
                    )
                    .map(item => item.occurrence_id)
            ).size;
        }
    }

    renderizarPendencias();
    renderizarAtividades(doDepartamento.slice(0, 5));
    atualizarIndicadoresEspecificos(
        atribuidasAoDepartamento,
        interacoesComOutrosSetores
    );
    ocultarMensagem();
}

function atualizarBarra(id, quantidade, total) {
    const barra = $(id);

    if (!barra) return;

    const percentual = total > 0 ? (quantidade / total) * 100 : 0;
    barra.style.width = `${Math.min(percentual, 100)}%`;
}

function atualizarIndicadoresEspecificos(
    ocorrencias,
    interacoesComOutrosSetores = 0
) {
    const abertas = ocorrencias.filter(item =>
        ["aberta", "andamento"].includes(obterStatus(item.status))
    ).length;

    const recentes = ocorrencias.filter(item => {
        if (!item.created_at) return false;

        const data = new Date(item.created_at);
        const limite = new Date();

        limite.setDate(limite.getDate() - 7);

        return !Number.isNaN(data.getTime()) && data >= limite;
    }).length;

    const valores = [
        abertas,
        interacoesComOutrosSetores,
        recentes
    ];

    valores.forEach((valor, indice) => {
        const elemento = document.querySelector(
            `[data-indicador-especifico="${indice}"]`
        );

        if (elemento) elemento.textContent = valor;
    });
}

function renderizarAtividades(ocorrencias) {
    const lista = $("listaAtividades");

    if (!lista) return;

    if (!ocorrencias.length) {
        lista.innerHTML = `
            <div class="departamento-estado-vazio">
                <i data-lucide="inbox"></i>
                <strong>Nenhuma atividade encontrada</strong>
                <span>Quando houver ocorrências relacionadas ao departamento, elas aparecerão aqui.</span>
            </div>
        `;

        atualizarIcones();
        return;
    }

    lista.innerHTML = ocorrencias.map(item => {
        const status = obterStatus(item.status);
        const icone = status === "resolvida" ? "check-circle-2" : "file-clock";
        const codigo = item.occurrence_code || item.id;

        return `
            <div class="departamento-atividade-item">
                <span class="departamento-atividade-icone">
                    <i data-lucide="${icone}"></i>
                </span>
                <div class="departamento-atividade-texto">
                    <strong>${escaparHTML(item.title || "Ocorrência sem título")}</strong>
                    <span>#${escaparHTML(codigo)} · ${escaparHTML(nomeStatus(item.status))} · ${escaparHTML(formatarData(item.updated_at || item.created_at))}</span>
                </div>
            </div>
        `;
    }).join("");

    atualizarIcones();
}

function renderizarPendencias() {
    const lista = todasPendencias[abaPendenciasAtual] || [];
    const corpo = $("tabelaPendencias");

    if (!corpo) return;

    if (!lista.length) {
        corpo.innerHTML = `
            <tr>
                <td colspan="5">
                    <div class="departamento-estado-vazio">
                        <i data-lucide="inbox"></i>
                        <strong>Nenhuma pendência encontrada</strong>
                        <span>Não há ocorrências nesta categoria para exibir.</span>
                    </div>
                </td>
            </tr>
        `;

        atualizarIcones();
        return;
    }

    corpo.innerHTML = lista.map(item => {
        const prioridade = obterPrioridade(item.severity);
        const outroDepartamentoId = abaPendenciasAtual === "recebidas"
            ? item.transferencia?.from_department_id
            : item.transferencia?.to_department_id;

        const nomeOutroDepartamento = obterNomeDepartamentoPorId(outroDepartamentoId);
        const codigo = item.occurrence_code || item.id;

        return `
            <tr>
                <td>
                    <span class="nome-ocorrencia">${escaparHTML(item.title || "Ocorrência sem título")}</span>
                    <span class="codigo-ocorrencia">#${escaparHTML(codigo)}</span>
                </td>
                <td>${escaparHTML(nomeOutroDepartamento)}</td>
                <td>
                    <span class="departamento-badge ${prioridade}">
                        ${escaparHTML(item.severity || "Não informada")}
                    </span>
                </td>
                <td>
                    <span class="departamento-badge status">
                        ${escaparHTML(nomeStatus(item.status))}
                    </span>
                </td>
                <td>${escaparHTML(formatarData(item.updated_at || item.created_at))}</td>
            </tr>
        `;
    }).join("");

    atualizarIcones();
}

function configurarAbas() {
    document.querySelectorAll("[data-pendencia]").forEach(botao => {
        botao.addEventListener("click", () => {
            abaPendenciasAtual = botao.dataset.pendencia;

            document.querySelectorAll("[data-pendencia]").forEach(aba => {
                const ativa = aba === botao;

                aba.classList.toggle("ativa", ativa);
                aba.setAttribute("aria-selected", String(ativa));
            });

            renderizarPendencias();
        });
    });
}

async function atualizarNotificacoes() {
    if (!usuarioAtual || !clienteSupabase) return;

    const botao = $("botaoNotificacoes");
    const bolinha = $("bolinhaNotificacoes");

    const { count, error } = await clienteSupabase
        .from(CONFIG.tabelaNotificacoes)
        .select("id", { count: "exact", head: true })
        .eq("user_id", usuarioAtual.id)
        .is("read_at", null);

    if (error) {
        console.error("Erro ao consultar notificações:", error);

        if (bolinha) bolinha.hidden = true;
        if (botao) botao.setAttribute("aria-label", "Notificações");

        return;
    }

    const quantidade = count || 0;

    if (bolinha) {
        bolinha.hidden = quantidade === 0;
    }

    if (botao) {
        botao.setAttribute(
            "aria-label",
            quantidade > 0
                ? `Notificações: ${quantidade} não lidas`
                : "Notificações"
        );

        botao.title = quantidade > 0
            ? `${quantidade} notificação(ões) não lida(s)`
            : "Notificações";
    }
}

function configurarNavegacao() {
    $("botaoNotificacoes")?.addEventListener("click", () => {
        window.location.href = "../notificacoes/index.html";
    });

    document.querySelector(".sair")?.addEventListener("click", async evento => {
        evento.preventDefault();

        const { error } = await clienteSupabase.auth.signOut();

        if (error) {
            console.error("Erro ao encerrar sessão:", error);
            alert("Não foi possível sair da conta. Tente novamente.");
            return;
        }

        window.location.href = caminhoLogin;
    });
}

async function controlarAcessosSidebar() {
    const linkDepartamento = $("linkDepartamento");
    const linkUsuarios = $("linkUsuarios");

    if (linkDepartamento) linkDepartamento.hidden = true;
    if (linkUsuarios) linkUsuarios.hidden = true;

    if (!clienteSupabase) return;

    const { data: sessaoData, error: erroSessao } =
        await clienteSupabase.auth.getSession();

    const usuario = sessaoData?.session?.user;

    if (erroSessao || !usuario) return;

    const { data: perfil, error } = await clienteSupabase
        .from(CONFIG.tabelaPerfis)
        .select("role, department_id")
        .eq("id", usuario.id)
        .maybeSingle();

    if (error || !perfil) return;

    const cargo = normalizarTexto(perfil.role);
    const ehSuperAdmin = [
        "superadmin",
        "superadministrador"
    ].includes(cargo);

    if (linkDepartamento) {
        linkDepartamento.hidden = ehSuperAdmin || !perfil.department_id;
    }

    if (linkUsuarios) {
        linkUsuarios.hidden = !ehSuperAdmin;
    }
}

async function iniciarPagina() {
    if (!clienteSupabase) {
        mostrarMensagem(
            "A conexão com o Supabase não foi encontrada. Verifique o arquivo ../../supabase.js.",
            true
        );
        return;
    }

    configurarAbas();
    configurarNavegacao();
    atualizarIcones();

    try {
        const perfilCarregado = await carregarPerfil();

        if (!perfilCarregado) return;

        await carregarDepartamentos();

        if (departamentoId) {
            departamentoAtual = departamentosCarregados.find(item =>
                item.id === departamentoId
            ) || departamentoAtual;

            atualizarPerfilVisual(
                perfilAtual?.display_name || usuarioAtual.email?.split("@")[0],
                departamentoAtual
            );

            personalizarDepartamento(
                departamentoId,
                obterNomeDepartamento(departamentoAtual)
            );

            await consultarOcorrencias();
        }

        await atualizarNotificacoes();

        if (intervaloAtualizacao) {
            window.clearInterval(intervaloAtualizacao);
        }

        intervaloAtualizacao = window.setInterval(async () => {
            await atualizarNotificacoes();

            if (departamentoId) {
                await consultarOcorrencias();
            }
        }, 60000);
    } catch (erro) {
        console.error("Erro ao iniciar a página Departamento:", erro);
        mostrarMensagem(
            "Ocorreu um erro ao carregar o painel. Atualize a página e tente novamente.",
            true
        );
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await controlarAcessosSidebar();
    await iniciarPagina();
});
