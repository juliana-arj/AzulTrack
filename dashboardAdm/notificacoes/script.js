
(function iniciarNotificacoes() {
    const supabase = window.supabaseClient;
    const lista = document.getElementById("listaNotificacoes");
    const mensagem = document.getElementById("mensagemNotificacoes");
    const pesquisa = document.getElementById("pesquisaNotificacao");
    const filtroLeitura = document.getElementById("filtroLeitura");

    const total = document.getElementById("totalNotificacoes");
    const naoLidas = document.getElementById("naoLidasNotificacoes");
    const lidas = document.getElementById("lidasNotificacoes");

    const nomeDepartamento = document.getElementById("nomeDepartamento");
    const nomeUsuario = document.getElementById("nomeUsuario");
    const avatarUsuario = document.getElementById("avatarUsuario");

    let usuarioAtual = null;
    let notificacoes = [];

    function atualizarIcones() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[caractere]);
    }

    function formatarData(data) {
        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(new Date(data));
    }

    function exibirMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", erro);
        mensagem.style.display = "block";
    }

    function atualizarIndicadores() {
        const quantidadeLidas = notificacoes.filter(n => n.read_at !== null).length;
        const quantidadeNaoLidas = notificacoes.length - quantidadeLidas;

        total.textContent = notificacoes.length;
        lidas.textContent = quantidadeLidas;
        naoLidas.textContent = quantidadeNaoLidas;
    }

    function obterNotificacoesFiltradas() {
        const termo = pesquisa.value.trim().toLocaleLowerCase("pt-BR");
        const filtro = filtroLeitura.value;

        return notificacoes.filter(notificacao => {
            const correspondePesquisa =
                notificacao.title.toLocaleLowerCase("pt-BR").includes(termo) ||
                notificacao.message.toLocaleLowerCase("pt-BR").includes(termo);

            const correspondeLeitura =
                filtro === "todas" ||
                (filtro === "nao_lidas" && notificacao.read_at === null) ||
                (filtro === "lidas" && notificacao.read_at !== null);

            return correspondePesquisa && correspondeLeitura;
        });
    }

    function renderizarNotificacoes() {
        const filtradas = obterNotificacoesFiltradas();

        lista.replaceChildren();
        mensagem.style.display = "none";

        if (filtradas.length === 0) {
            lista.innerHTML = `
                <div class="notificacoes-vazio">
                    <i data-lucide="bell-off" class="icone"></i>
                    <h3>Nenhuma notificação encontrada</h3>
                    <p>Não há avisos correspondentes aos filtros selecionados.</p>
                </div>
            `;
            atualizarIcones();
            return;
        }

        lista.innerHTML = filtradas.map(notificacao => {
            const lida = notificacao.read_at !== null;

            return `
                <article class="notificacao-item ${lida ? "" : "nao-lida"}">
                    <div class="notificacao-simbolo">
                        <i data-lucide="${lida ? "bell" : "bell-ring"}" class="icone"></i>
                    </div>

                    <div class="notificacao-conteudo">
                        ${lida ? "" : '<span class="notificacao-selo">NOVA</span>'}
                        <h3 class="notificacao-titulo">
                            ${escaparHTML(notificacao.title)}
                        </h3>

                        <p class="notificacao-texto">${escaparHTML(notificacao.message)}</p>

                        <span class="notificacao-data">
                            ${escaparHTML(formatarData(notificacao.created_at))}
                        </span>

                        ${lida ? "" : `
                            <div class="notificacao-acoes">
                                <button
                                    type="button"
                                    class="notificacao-acao"
                                    data-marcar-lida="${escaparHTML(notificacao.id)}">
                                    Marcar como lida
                                </button>
                            </div>
                        `}
                    </div>
                </article>
            `;
        }).join("");

        atualizarIcones();
    }

    async function carregarPerfil() {
        const { data: { user }, error: erroUsuario } =
            await supabase.auth.getUser();

        if (erroUsuario) throw erroUsuario;

        if (!user) {
            window.location.href = "../../login/index.html";
            return false;
        }

        usuarioAtual = user;

        const { data: perfil, error } = await supabase
            .from("profiles")
            .select("display_name, department_id, role")
            .eq("id", user.id)
            .single();

        if (error) throw error;

        nomeUsuario.textContent =
            perfil.display_name || user.email || "Usuário";

        const departamentos = {
            atendimento: "Atendimento",
            comunicacao: "Comunicação",
            operacoes: "Operações",
            gestao: "Gestão"
        };

        nomeDepartamento.textContent =
            perfil.role === "super_admin"
                ? "Administrador geral"
                : departamentos[perfil.department_id] || "Central de notificações";

        const nome = perfil.display_name || user.email || "AT";

        avatarUsuario.textContent = nome
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte[0])
            .join("")
            .toUpperCase();

        return true;
    }

    async function carregarNotificacoes() {
        exibirMensagem("Carregando notificações...");

        try {
            const { data, error } = await supabase
                .from("notifications")
                .select("id, user_id, title, message, read_at, created_at")
                .eq("user_id", usuarioAtual.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            notificacoes = data || [];

            atualizarIndicadores();
            renderizarNotificacoes();
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
            lista.replaceChildren();
            exibirMensagem(
                "Não foi possível carregar as notificações. Verifique sua conexão e as permissões do banco.",
                true
            );
        }
    }

    async function marcarComoLida(id) {
        const notificacao = notificacoes.find(n => n.id === id);

        if (!notificacao || notificacao.read_at !== null) return;

        const dataLeitura = new Date().toISOString();

        const { data, error } = await supabase
            .from("notifications")
            .update({ read_at: dataLeitura })
            .eq("id", id)
            .eq("user_id", usuarioAtual.id)
            .is("read_at", null)
            .select("id, read_at")
            .maybeSingle();

        if (error) {
            console.error("Erro ao marcar notificação como lida:", error);
            exibirMensagem("Não foi possível atualizar a notificação.", true);
            return;
        }

        if (!data) {
            await carregarNotificacoes();
            return;
        }

        notificacao.read_at = data.read_at;
        atualizarIndicadores();
        renderizarNotificacoes();
    }

    async function marcarTodasComoLidas() {
        const pendentes = notificacoes.filter(n => n.read_at === null);

        if (pendentes.length === 0) return;

        const { error } = await supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", usuarioAtual.id)
            .is("read_at", null);

        if (error) {
            console.error("Erro ao marcar notificações como lidas:", error);
            exibirMensagem("Não foi possível atualizar as notificações.", true);
            return;
        }

        await carregarNotificacoes();
    }

    lista.addEventListener("click", async event => {
        const botao = event.target.closest("[data-marcar-lida]");

        if (!botao) return;

        botao.disabled = true;

        try {
            await marcarComoLida(botao.dataset.marcarLida);
        } finally {
            botao.disabled = false;
        }
    });

    pesquisa.addEventListener("input", renderizarNotificacoes);
    filtroLeitura.addEventListener("change", renderizarNotificacoes);

    document.getElementById("atualizarNotificacoes")
        .addEventListener("click", carregarNotificacoes);

    document.getElementById("marcarTodasLidas")
        .addEventListener("click", marcarTodasComoLidas);

    document.getElementById("sairConta").addEventListener("click", async event => {
        event.preventDefault();

        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Erro ao sair:", error);
            return;
        }

        window.location.href = "../../login/index.html";
    });

    async function iniciar() {
        try {
            const autenticado = await carregarPerfil();

            if (autenticado) {
                await carregarNotificacoes();
            }
        } catch (error) {
            console.error("Erro ao iniciar notificações:", error);
            exibirMensagem(
                "Não foi possível carregar seu perfil. Verifique o acesso à sua conta.",
                true
            );
        }

        atualizarIcones();
    }

    iniciar();
})();