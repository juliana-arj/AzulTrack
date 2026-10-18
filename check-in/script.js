document.querySelectorAll(".etapa").forEach(function (etapa) {
    etapa.addEventListener("toggle", function () {
        if (etapa.open) {
            document.querySelectorAll(".etapa").forEach(function (outraEtapa) {
                if (outraEtapa !== etapa) {
                    outraEtapa.open = false;
                }
            });
        }
    });
});


function obterIniciais(nome) {
    const partes = (nome || "Cliente").trim().split(/\s+/);

    if (partes.length === 1) {
        return partes[0][0].toUpperCase();
    }

    return (
        partes[0][0] + partes[partes.length - 1][0]
    ).toUpperCase();
}

async function carregarPerfilOrientacoes() {
    const cliente = document.getElementById("nomeCliente");
    const avatar = document.getElementById("avatarCliente");

    try {
        const { data: sessaoData, error } =
            await supabaseClient.auth.getSession();

        if (error) throw error;

        const usuario = sessaoData.session?.user;

        if (!usuario) {
            window.location.replace("../login/index.html");
            return;
        }

        const nome =
            usuario.user_metadata?.full_name ||
            usuario.user_metadata?.nome_completo ||
            usuario.email?.split("@")[0] ||
            "Cliente";

        cliente.textContent = nome;
        avatar.textContent = obterIniciais(nome);
        avatar.title = nome;

        await carregarNotificacoes(usuario);
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        cliente.textContent = "Área do cliente";
        avatar.textContent = "CL";
    }
}

async function carregarNotificacoes(usuario) {
    const bolinha = document.getElementById("bolinhaNotificacoes");
    const botao = document.getElementById("botaoNotificacoes");

    if (!bolinha || !botao) return;

    const { count, error } = await supabaseClient
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", usuario.id)
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

    if (!autenticado) return;

    await carregarPerfilOrientacoes();
    inicializarDashboard();
});

supabaseClient.auth.onAuthStateChange((evento, sessao) => {
    if (evento === "SIGNED_OUT" || !sessao) {
        window.location.replace("../login/index.html");
    }
});

if (window.lucide) lucide.createIcons();