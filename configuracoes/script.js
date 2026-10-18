
(async function iniciarConfiguracoes() {
    const supabase = window.supabaseClient;
    const caminhoLogin = "../../login/index.html";
    const mensagem = document.getElementById("mensagemConfiguracoes");

    let usuarioAtual = null;

    function exibirMensagem(texto, erro = false) {
        mensagem.textContent = texto;
        mensagem.classList.toggle("erro", erro);
        mensagem.hidden = false;
        mensagem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function iniciais(nome) {
        const partes = (nome || "Cliente").trim().split(/\s+/).filter(Boolean);

        if (partes.length === 1) return partes[0][0].toUpperCase();

        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
    }

    function definirNome(nome) {
        const letras = iniciais(nome);

        document.getElementById("nomeCliente").textContent = nome;
        document.getElementById("avatarCliente").textContent = letras;
        document.getElementById("avatarCliente").title = nome;
        document.getElementById("avatarPerfil").textContent = letras;
        document.getElementById("perfilNome").textContent = nome;
        document.getElementById("detalheNome").textContent = nome;
        document.getElementById("nomeExibicao").value = nome;
    }

    function definirEmail(email) {
        document.getElementById("perfilEmail").textContent = email || "—";
        document.getElementById("detalheEmail").textContent = email || "—";
        document.getElementById("emailAtual").value = email || "";
    }

    if (!supabase) {
        window.location.replace(caminhoLogin);
        return;
    }

    const { data: sessaoData, error: erroSessao } =
        await supabase.auth.getSession();

    usuarioAtual = sessaoData?.session?.user;

    if (erroSessao || !usuarioAtual) {
        window.location.replace(caminhoLogin);
        return;
    }

    const nome =
        usuarioAtual.user_metadata?.full_name ||
        usuarioAtual.user_metadata?.nome_completo ||
        usuarioAtual.email?.split("@")[0] ||
        "Cliente";

    definirNome(nome);
    definirEmail(usuarioAtual.email || "");

    async function atualizarNotificacoes() {
        const bolinha = document.getElementById("bolinhaNotificacoes");
        const botao = document.getElementById("botaoNotificacoes");

        if (!bolinha || !botao) return;

        const { count, error } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", usuarioAtual.id)
            .not("source_update_id", "is", null)
            .is("read_at", null);

        if (error) {
            console.error("Erro ao consultar notificações:", error);
            bolinha.hidden = true;
            return;
        }

        const quantidade = count || 0;

        bolinha.hidden = quantidade === 0;
        botao.setAttribute(
            "aria-label",
            quantidade > 0
                ? `Notificações, ${quantidade} não lidas`
                : "Notificações"
        );
        botao.title = quantidade > 0
            ? `${quantidade} notificação(ões) não lida(s)`
            : "Ver notificações";
    }

    document.getElementById("botaoNotificacoes").addEventListener("click", () => {
        window.location.href = "../notificacoes/index.html";
    });

    await atualizarNotificacoes();
    window.setInterval(atualizarNotificacoes, 60000);

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
            const { data, error } = await supabase.auth.updateUser({
                data: {
                    full_name: novoNome,
                    nome_completo: novoNome
                }
            });

            if (error) throw error;

            usuarioAtual = data.user || usuarioAtual;
            definirNome(novoNome);
            exibirMensagem("Nome de exibição atualizado com sucesso.");
        } catch (erro) {
            console.error("Erro ao atualizar nome:", erro);
            exibirMensagem("Não foi possível atualizar seu nome. Tente novamente.", true);
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

            exibirMensagem("Solicitação enviada. Confira seu e-mail para concluir a alteração.");
        } catch (erro) {
            console.error("Erro ao atualizar e-mail:", erro);
            exibirMensagem(erro.message || "Não foi possível solicitar a alteração do e-mail.", true);
        } finally {
            botao.disabled = false;
        }
    });

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

    supabase.auth.onAuthStateChange(evento => {
        if (evento === "SIGNED_OUT") {
            window.location.replace(caminhoLogin);
        }
    });

    document.querySelectorAll(".configuracoes-nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".configuracoes-nav-link").forEach(item => {
                item.classList.toggle("ativo", item === link);
            });
        });
    });

    if (window.lucide) {
        window.lucide.createIcons();
    } else {
        console.error("Lucide não foi carregado.");
    }
})();

if (window.lucide) {
    window.lucide.createIcons();
} else {
    console.error("Lucide não foi carregado.");
};
