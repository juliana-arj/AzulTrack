

const nomeCliente = document.getElementById("nomeCliente");
const avatarCliente = document.getElementById("avatarCliente");
const formConsulta = document.getElementById("formConsulta");
const codigoConsulta = document.getElementById("codigoConsulta");
const dataConsulta = document.getElementById("dataConsulta");
const mensagemConsulta = document.getElementById("mensagemConsulta");
const resultadoVoo = document.getElementById("resultadoVoo");
const statusVoo = document.getElementById("statusVoo");
const statusConsulta = document.getElementById("statusConsulta");
const buscaRapida = document.getElementById("buscaRapida");
const buscaGlobal = document.getElementById("buscaGlobal");
const listaVoosAcompanhados = document.getElementById("listaVoosAcompanhados");
const contadorVoos = document.getElementById("contadorVoos");

let usuarioAtual = null;
let voosUsuario = [];

function escaparHTML(valor = "") {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function formatarData(data) {
    if (!data) return "Data não informada";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
}


function formatarHorario(dataHora) {
    if (!dataHora) return "Horário não informado";

    const data = new Date(dataHora);

    if (Number.isNaN(data.getTime())) return "Horário não informado";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function traduzirStatus(status) {
    const traducoes = {
        scheduled: "Agendado",
        active: "Em andamento",
        landed: "Pousou",
        cancelled: "Cancelado",
        canceled: "Cancelado",
        diverted: "Desviado",
        incident: "Incidente",
        delayed: "Atrasado",
        unknown: "Status desconhecido"
    };

    return traducoes[String(status || "").toLowerCase()] || "Status não informado";
}

function obterIniciais(nome) {
    const partes = (nome || "Cliente").trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0].slice(0, 2).toUpperCase();
    }

    return (
        partes[0][0] + partes[partes.length - 1][0]
    ).toUpperCase();
}

function mostrarMensagem(texto) {
    if (mensagemConsulta) {
        mensagemConsulta.textContent = texto;
    }
}

async function inicializarDashboard() {
    if (!supabaseClient) {
        mostrarMensagem("Não foi possível conectar ao Supabase.");
        return;
    }

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) {
        mostrarMensagem("Não foi possível verificar sua sessão.");
        console.error(error);
        return;
    }

    usuarioAtual = data.session?.user || null;

    if (usuarioAtual) {
        await carregarPerfil();
        await carregarVoos();
        await carregarNotificacoes();
    } else {
        if (nomeCliente) {
            nomeCliente.textContent = "Consulta pública";
        }

        if (avatarCliente) {
            avatarCliente.textContent = "CL";
        }

        if (listaVoosAcompanhados) {
            listaVoosAcompanhados.innerHTML = `
                <div class="resultado-vazio">
                    <h3>Entre para acompanhar voos</h3>
                    <p>Você pode consultar voos sem login. Para salvar
                    e gerenciar seus acompanhamentos, entre na sua conta.</p>
                    <a href="../login/index.html">Entrar na conta</a>
                </div>
            `;
        }

        if (contadorVoos) {
            contadorVoos.textContent = "Faça login";
        }

        const linkSair = document.querySelector(".sair");

        if (linkSair) {
            linkSair.textContent = "Entrar na conta";
            linkSair.href = "../login/index.html";
            linkSair.querySelector(".icone")?.remove();
        }
    }

    await carregarAvisos();
}

async function carregarPerfil() {
    const { data, error } = await supabaseClient
        .from("profiles")
        .select("display_name, role")
        .eq("id", usuarioAtual.id)
        .maybeSingle();

    if (error || !data) {
        nomeCliente.textContent = "Cliente";
        console.error("Erro ao carregar perfil:", error);
        return;
    }

    const nome = data.display_name || "Cliente";

    nomeCliente.textContent = `Olá, ${nome}`;
    avatarCliente.textContent = obterIniciais(nome);
    avatarCliente.title = nome;
}

async function carregarVoos() {
    if (!usuarioAtual || !listaVoosAcompanhados) return;

    const { data, error } = await supabaseClient
        .from("tracked_flights")
        .select("id, flight_number, travel_date, created_at")
        .eq("user_id", usuarioAtual.id)
        .order("travel_date", { ascending: true });

    if (error) {
        console.error("Erro ao carregar voos:", error);

        listaVoosAcompanhados.innerHTML = `
            <div class="resultado-vazio">
                <h3>Não foi possível carregar os voos</h3>
                <p>Verifique sua conexão e as permissões do banco.</p>
            </div>
        `;
        return;
    }

    voosUsuario = data || [];

    if (contadorVoos) {
        contadorVoos.textContent =
            `${voosUsuario.length} ${voosUsuario.length === 1 ? "voo" : "voos"}`;
    }

    if (voosUsuario.length === 0) {
        listaVoosAcompanhados.innerHTML = `
            <div class="resultado-vazio">
                <h3>Nenhum voo acompanhado</h3>
                <p>Consulte um voo e adicione-o à sua lista.</p>
            </div>
        `;
        return;
    }

    listaVoosAcompanhados.innerHTML = `
        <div class="lista-voos">
            ${voosUsuario.map(voo => `
                <article class="voo-salvo">
                    <button type="button"
                        class="abrir-voo"
                        data-voo="${escaparHTML(voo.flight_number)}"
                        data-data="${escaparHTML(voo.travel_date)}">
                        <span>
                            <strong>Voo ${escaparHTML(voo.flight_number)}</strong>
                            <small>${formatarData(voo.travel_date)}</small>
                        </span>
                        <span aria-hidden="true">→</span>
                    </button>
                    <button type="button"
                        class="remover-voo"
                        data-id="${escaparHTML(voo.id)}"
                        aria-label="Remover voo ${escaparHTML(voo.flight_number)}">
                        Remover
                    </button>
                </article>
            `).join("")}
        </div>
    `;

    listaVoosAcompanhados.querySelectorAll(".abrir-voo").forEach(botao => {
        botao.addEventListener("click", () => {
            codigoConsulta.value = botao.dataset.voo;
            dataConsulta.value = botao.dataset.data;

            consultarVoo(botao.dataset.voo, botao.dataset.data);

            document.getElementById("meu-voo").scrollIntoView({
                behavior: "smooth"
            });
        });
    });

    listaVoosAcompanhados.querySelectorAll(".remover-voo").forEach(botao => {
        botao.addEventListener("click", () => removerVoo(botao.dataset.id));
    });
}

async function consultarVoo(numero, data) {
    const resultado = document.getElementById("resultadoVoo");
    const mensagem = document.getElementById("mensagemConsulta");

    resultado.replaceChildren();
    mensagem.textContent = "Consultando voo...";

    try {
        const { data: resposta, error } =
            await supabaseClient.functions.invoke("clever-worker", {
                body: {
                    numero: numero.trim().toUpperCase(),
                    data: data
                }
            });

        if (error) throw error;

        if (resposta.erro || !resposta.voos?.length) {
            mensagem.textContent = resposta.erro || "Nenhum voo encontrado.";
            return;
        }

        const voo = resposta.voos[0];
        const numeroVoo = voo.flight?.iata ?? numero;
        const origem = voo.departure?.airport ?? "Não informada";
        const destino = voo.arrival?.airport ?? "Não informado";
        const partida = formatarHorario(voo.departure?.scheduled);
        const chegada = formatarHorario(voo.arrival?.scheduled);
        const status = traduzirStatus(voo.flight_status);

        mensagem.textContent = "";

        resultado.innerHTML = `
            <article class="voo-card">
                <header class="resultado-cabecalho">
                    <div>
                        <span class="resultado-legenda">DETALHES DO VOO</span>
                        <h3>Voo ${escaparHTML(numeroVoo)}</h3>
                        <p>${escaparHTML(voo.airline?.name ?? "Azul Linhas Aéreas")}</p>
                    </div>
                    <span class="status-resultado">${escaparHTML(status)}</span>
                </header>

                <div class="resultado-rota">
                    <div class="resultado-aeroporto">
                        <span>ORIGEM</span>
                        <strong>${escaparHTML(origem)}</strong>
                    </div>
                    <div class="resultado-rota-icone" aria-hidden="true">→</div>
                    <div class="resultado-aeroporto resultado-destino">
                        <span>DESTINO</span>
                        <strong>${escaparHTML(destino)}</strong>
                    </div>
                </div>

                <div class="resultado-detalhes">
                    <div>
                        <span>Data da viagem</span>
                        <strong>${formatarData(data)}</strong>
                    </div>
                    <div>
                        <span>Partida prevista</span>
                        <strong>${escaparHTML(partida)}</strong>
                    </div>
                    <div>
                        <span>Chegada prevista</span>
                        <strong>${escaparHTML(chegada)}</strong>
                    </div>
                </div>

                <button type="button" class="botao-principal botao-acompanhar">
                    Acompanhar este voo
                </button>
            </article>
        `;

        resultado.querySelector(".botao-acompanhar")
            .addEventListener("click", () => {
                salvarVoo(numero.trim().toUpperCase(), data);
            });

    } catch (erro) {
        console.error("Erro ao consultar voo:", erro);
        mensagem.textContent =
            "Não foi possível consultar o voo. Tente novamente.";
    }
}

async function salvarVoo(numero, data) {
    if (!supabaseClient) {
        mostrarMensagem("Não foi possível conectar ao serviço.");
        return;
    }

    const { data: sessaoData, error: erroSessao } =
        await supabaseClient.auth.getSession();

    if (erroSessao) {
        mostrarMensagem("Não foi possível verificar sua sessão.");
        return;
    }

    usuarioAtual = sessaoData.session?.user || null;

    if (!usuarioAtual) {
        mostrarMensagem(
            "Entre na sua conta para salvar este voo nos acompanhamentos."
        );
        return;
    }

    const { data: existente, error: erroBusca } = await supabaseClient
        .from("tracked_flights")
        .select("id")
        .eq("user_id", usuarioAtual.id)
        .eq("flight_number", numero)
        .eq("travel_date", data)
        .maybeSingle();

    if (erroBusca) {
        console.error(erroBusca);
        mostrarMensagem("Não foi possível verificar seus voos salvos.");
        return;
    }

    if (existente) {
        mostrarMensagem("Este voo já está na sua lista.");
        return;
    }

    const { error } = await supabaseClient
        .from("tracked_flights")
        .insert({
            user_id: usuarioAtual.id,
            flight_number: numero,
            travel_date: data
        });

    if (error) {
        console.error("Erro ao salvar voo:", error);
        mostrarMensagem("Não foi possível salvar o voo.");
        return;
    }

    mostrarMensagem("Voo salvo nos seus acompanhamentos.");

    await carregarVoos();
}

async function removerVoo(id) {
    if (!usuarioAtual) return;

    const confirmar = window.confirm(
        "Deseja remover este voo dos seus acompanhamentos?"
    );

    if (!confirmar) return;

    const { error } = await supabaseClient
        .from("tracked_flights")
        .delete()
        .eq("id", id)
        .eq("user_id", usuarioAtual.id);

    if (error) {
        console.error("Erro ao remover voo:", error);
        mostrarMensagem("Não foi possível remover o voo.");
        return;
    }

    mostrarMensagem("Voo removido dos seus acompanhamentos.");
    await carregarVoos();
}


document.getElementById("formConsulta").addEventListener("submit", (event) => {
    event.preventDefault();

    const numero = document.getElementById("codigoConsulta").value;
    const data = document.getElementById("dataConsulta").value;

    if (!data) {
        document.getElementById("mensagemConsulta").textContent =
            "Selecione a data do voo.";
        return;
    }

    consultarVoo(numero, data);
});


buscaRapida?.addEventListener("submit", async evento => {
    evento.preventDefault();

    const numero = buscaGlobal.value.trim().toUpperCase();

    codigoConsulta.value = numero;

    document.getElementById("meu-voo").scrollIntoView({
        behavior: "smooth"
    });

    if (!dataConsulta.value) {
        mostrarMensagem("Selecione a data do voo para consultar.");
        dataConsulta.focus();
        return;
    }

    await consultarVoo(numero, dataConsulta.value);
});

async function carregarNotificacoes() {
    if (!usuarioAtual) return;

    const { data, error } = await supabaseClient
        .from("notifications")
        .select("id, title, message, read_at, created_at")
        .eq("user_id", usuarioAtual.id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Erro ao carregar notificações:", error);
        return;
    }

    const secao = document.getElementById("notificacoes");
    if (!secao) return;

    secao.querySelectorAll(".notificacao-dinamica")
        .forEach(item => item.remove());

    const contador = document.querySelector(".contador");
    const naoLidas = (data || []).filter(item => !item.read_at).length;

    if (contador) {
        contador.textContent = naoLidas;
        contador.hidden = naoLidas === 0;
    }

    data.forEach(item => {
        secao.insertAdjacentHTML("beforeend", `
            <article class="aviso notificacao-dinamica">
                <div class="aviso-icone">${item.read_at ? "✓" : "i"}</div>
                <div>
                    <h3>${escaparHTML(item.title)}</h3>
                    <p>${escaparHTML(item.message)}</p>
                    <small>
                        ${new Date(item.created_at).toLocaleString("pt-BR")}
                        ${item.read_at ? " · Lida" : " · Não lida"}
                    </small>
                </div>
            </article>
        `);
    });
}

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((evento, session) => {
        if (evento === "SIGNED_OUT") {
            usuarioAtual = null;
            window.location.replace("../login/index.html");
        } else if (evento === "SIGNED_IN" && session) {
            window.location.reload();
        }
    });

    inicializarDashboard();
} else {
    mostrarMensagem("Não foi possível conectar ao Supabase.");
}

async function verificarAutenticacao() {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.replace("../login/index.html");
        return false;
    }

    return true;
}

document.addEventListener("DOMContentLoaded", async () => {
    const autenticado = await verificarAutenticacao();

    if (!autenticado) {
        return;
    }

    inicializarDashboard();
});

supabaseClient.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "SIGNED_OUT" || !sessao) {
        window.location.replace("../login/index.html");
    }
});

lucide.createIcons();

