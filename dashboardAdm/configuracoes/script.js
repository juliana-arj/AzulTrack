
(async function iniciarConfiguracoes() {
    const supabase = window.supabaseClient;
    const caminhoLogin = "../../login/index.html";
    const mensagem = document.getElementById("mensagemConfiguracoes");

    let usuarioAtual = null;
    let perfilAtual = null;

    function exibirMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", erro);
        mensagem.hidden = false;
        mensagem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function iniciais(nome) {
        return nome
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(parte => parte[0])
            .join("")
            .toUpperCase() || "U";
    }

    function definirTexto(id, texto) {
        const elemento = document.getElementById(id);

        if (elemento) elemento.textContent = texto || "—";
    }

    function definirAvatar(nome) {
        const letras = iniciais(nome);

        definirTexto("nomeUsuario", nome);
        definirTexto("avatarUsuario", letras);
        definirTexto("avatarPerfil", letras);
        definirTexto("perfilNome", nome);
        definirTexto("detalheNome", nome);
    }

    function definirDepartamento(nome) {
        definirTexto("departamentoUsuario", nome);
        definirTexto("perfilDepartamento", nome);
        definirTexto("detalheDepartamento", nome);
    }

    function definirFuncao(nome) {
        definirTexto("perfilFuncao", nome);
        definirTexto("detalheFuncao", nome);
    }

    function definirEmail(email) {
        definirTexto("perfilEmail", email);
        definirTexto("detalheEmail", email);

        document.getElementById("emailAtual").value = email;
    }

    if (!supabase) {
        window.location.replace(caminhoLogin);
        return;
    }

    const { data: sessaoData, error: erroSessao } =
        await supabase.auth.getSession();

    const sessao = sessaoData?.session;

    if (erroSessao || !sessao) {
        window.location.replace(caminhoLogin);
        return;
    }

    usuarioAtual = sessao.user;

    const { data: perfil, error: erroPerfil } = await supabase
        .from("profiles")
        .select("display_name, role, department_id")
        .eq("id", usuarioAtual.id)
        .maybeSingle();

    if (erroPerfil || !perfil) {
        console.error("Erro ao carregar perfil:", erroPerfil);
        exibirMensagem("Não foi possível verificar seu perfil e suas permissões.", true);
        return;
    }

    if (perfil.role !== "super_admin" && !perfil.department_id) {
        window.location.replace(caminhoLogin);
        return;
    }

    perfilAtual = perfil;

    const nome = perfil.display_name?.trim()
        || usuarioAtual.email
        || "Usuário";

    definirAvatar(nome);
    definirEmail(usuarioAtual.email || "");
    document.getElementById("nomeExibicao").value = perfil.display_name || "";

    const funcoes = {
        super_admin: "Super administrador",
        admin: "Administrador",
        funcionario: "Funcionário",
        employee: "Funcionário"
    };

    definirFuncao(funcoes[perfil.role] || "Usuário");

    if (perfil.role === "super_admin") {
        definirDepartamento("Super administrador");
    } else if (perfil.department_id) {
        const { data: departamento, error: erroDepartamento } =
            await supabase
                .from("departments")
                .select("name")
                .eq("id", perfil.department_id)
                .maybeSingle();

        if (erroDepartamento) {
            console.error("Erro ao consultar departamento:", erroDepartamento);
        }

        definirDepartamento(departamento?.name || "Departamento definido");
    } else {
        definirDepartamento("Departamento não definido");
    }


    const botaoNotificacoes = document.getElementById("botaoNotificacoes");
    const bolinhaNotificacoes = document.getElementById("bolinhaNotificacoes");

    async function atualizarNotificacoes() {
        const { data, error } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", usuarioAtual.id)
            .is("read_at", null);

        if (error) {
            console.error("Erro ao verificar notificações:", error);
            return;
        }

        const quantidade = data?.length || 0;

        if (bolinhaNotificacoes) {
            bolinhaNotificacoes.hidden = quantidade === 0;
        }

        if (botaoNotificacoes) {
            botaoNotificacoes.setAttribute(
                "aria-label",
                quantidade > 0
                    ? `Notificações: ${quantidade} não lidas`
                    : "Notificações"
            );

            botaoNotificacoes.title = quantidade > 0
                ? `${quantidade} notificação(ões) não lida(s)`
                : "Notificações";
        }
    }

    botaoNotificacoes?.addEventListener("click", () => {
        window.location.href = "../notificacoes/index.html";
    });

    await atualizarNotificacoes();

    window.setInterval(atualizarNotificacoes, 60000);

    const botaoSair = document.querySelector(".sair");

    botaoSair?.addEventListener("click", async evento => {
        evento.preventDefault();
        botaoSair.style.pointerEvents = "none";

        try {
            const { error } = await supabase.auth.signOut();

            if (error) throw error;

            window.location.replace(caminhoLogin);
        } catch (erro) {
            console.error("Erro ao sair:", erro);
            botaoSair.style.pointerEvents = "";
            exibirMensagem("Não foi possível encerrar a sessão. Tente novamente.", true);
        }
    });

    document.getElementById("formNome").addEventListener("submit", async evento => {
        evento.preventDefault();

        const botao = document.getElementById("salvarNome");
        const novoNome = document.getElementById("nomeExibicao").value.trim();

        if (!novoNome) {
            exibirMensagem("Informe seu nome de exibição.", true);
            return;
        }

        if (novoNome.length > 100) {
            exibirMensagem("O nome deve ter no máximo 100 caracteres.", true);
            return;
        }

        botao.disabled = true;

        try {
            const { error } = await supabase
                .from("profiles")
                .update({ display_name: novoNome })
                .eq("id", usuarioAtual.id);

            if (error) throw error;

            perfilAtual.display_name = novoNome;
            definirAvatar(novoNome);
            exibirMensagem("Nome de exibição atualizado com sucesso.");
        } catch (erro) {
            console.error("Erro ao atualizar nome:", erro);
            exibirMensagem("Não foi possível atualizar o nome. Verifique as permissões do seu perfil.", true);
        } finally {
            botao.disabled = false;
        }
    });

    document.getElementById("formEmail").addEventListener("submit", async evento => {
        evento.preventDefault();

        const botao = document.getElementById("salvarEmail");
        const novoEmail = document.getElementById("emailAtual").value.trim();

        if (!novoEmail) {
            exibirMensagem("Informe um e-mail válido.", true);
            return;
        }

        if (novoEmail.toLowerCase() === (usuarioAtual.email || "").toLowerCase()) {
            exibirMensagem("O e-mail informado é igual ao atual.", true);
            return;
        }

        botao.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({
                email: novoEmail
            });

            if (error) throw error;

            exibirMensagem("Solicitação enviada. Verifique sua caixa de entrada para confirmar a alteração do e-mail.");
        } catch (erro) {
            console.error("Erro ao solicitar alteração de e-mail:", erro);
            exibirMensagem(erro.message || "Não foi possível solicitar a alteração do e-mail.", true);
        } finally {
            botao.disabled = false;
        }
    });

    async function controlarAcessosSidebar() {
        const linkDepartamento = document.getElementById("linkDepartamento");
        const linkUsuarios = document.getElementById("linkUsuarios");

        if (linkDepartamento) linkDepartamento.hidden = true;
        if (linkUsuarios) linkUsuarios.hidden = true;

        if (!window.supabaseClient) return;

        const { data: sessaoData } = await window.supabaseClient.auth.getSession();
        const usuario = sessaoData?.session?.user;

        if (!usuario) return;

        const { data: perfil, error } = await window.supabaseClient
            .from("profiles")
            .select("role, department_id")
            .eq("id", usuario.id)
            .maybeSingle();

        if (error || !perfil) return;

        const cargo = String(perfil.role || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

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

    controlarAcessosSidebar();

    document.getElementById("formSenha").addEventListener("submit", async evento => {
        evento.preventDefault();

        const botao = document.getElementById("salvarSenha");
        const novaSenha = document.getElementById("novaSenha").value;
        const confirmarSenha = document.getElementById("confirmarSenha").value;

        if (novaSenha.length < 8) {
            exibirMensagem("A senha deve ter pelo menos 8 caracteres.", true);
            return;
        }

        if (novaSenha !== confirmarSenha) {
            exibirMensagem("As senhas informadas não são iguais.", true);
            return;
        }

        botao.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({
                password: novaSenha
            });

            if (error) throw error;

            document.getElementById("formSenha").reset();
            exibirMensagem("Senha alterada com sucesso.");
        } catch (erro) {
            console.error("Erro ao alterar senha:", erro);
            exibirMensagem(erro.message || "Não foi possível alterar a senha.", true);
        } finally {
            botao.disabled = false;
        }
    });

    document.querySelectorAll(".mostrar-senha").forEach(botao => {
        botao.addEventListener("click", () => {
            const campo = document.getElementById(botao.dataset.alvo);
            const mostrar = campo.type === "password";

            campo.type = mostrar ? "text" : "password";
            botao.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");

            const icone = botao.querySelector("i");

            if (icone) {
                icone.setAttribute("data-lucide", mostrar ? "eye-off" : "eye");
            }

            if (window.lucide) window.lucide.createIcons();
        });
    });

    document.querySelectorAll(".configuracoes-nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".configuracoes-nav-link").forEach(item => {
                item.classList.toggle("ativo", item === link);
            });
        });
    });

    if (window.lucide) window.lucide.createIcons();
})();
