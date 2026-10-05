
const areaPerfil = document.getElementById("areaPerfil");
const botoesHero = document.getElementById("botoesHero");
const linkDashboard = document.getElementById("linkDashboard");

function obterIniciais(nome) {
    const partes = nome.trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return "U";
    }

    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }

    return (
        partes[0][0] +
        partes[partes.length - 1][0]
    ).toUpperCase();
}

async function verificarSessao() {
    const { data, error } =
        await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
        configurarUsuarioDeslogado();
        return;
    }

    const usuario = data.session.user;

    const { data: perfil, error: erroPerfil } =
        await window.supabaseClient
            .from("profiles")
            .select("display_name, role, department_id")
            .eq("id", usuario.id)
            .single();

    if (erroPerfil || !perfil) {
        configurarUsuarioDeslogado();
        return;
    }

    configurarUsuarioLogado(perfil);
}

function configurarUsuarioDeslogado() {
    areaPerfil.innerHTML = `
        <a href="../login/index.html" class="botao-login-nav">
            Login
        </a>
    `;

    botoesHero.style.display = "flex";
}


function configurarUsuarioLogado(perfil) {
    const nome = perfil.display_name || "Usuário";
    const iniciais = obterIniciais(nome);

    areaPerfil.innerHTML = `
        <button type="button" class="avatar-perfil"
            id="avatarPerfil"
            aria-label="Abrir opções da conta">
            ${iniciais}
        </button>

        <div class="menu-perfil" id="menuPerfil">
            <button type="button" class="botao-sair" id="botaoSair">
                Sair da conta
            </button>
        </div>
    `;

    botoesHero.style.display = "none";

    const avatarPerfil = document.getElementById("avatarPerfil");
    const menuPerfil = document.getElementById("menuPerfil");
    const botaoSair = document.getElementById("botaoSair");

    avatarPerfil.addEventListener("click", (evento) => {
        evento.stopPropagation();
        menuPerfil.classList.toggle("aberto");
    });

    document.addEventListener("click", (evento) => {
        if (!areaPerfil.contains(evento.target)) {
            menuPerfil.classList.remove("aberto");
        }
    });

    botaoSair.addEventListener("click", async () => {
        botaoSair.disabled = true;
        botaoSair.textContent = "Saindo...";

        const { error } = await window.supabaseClient.auth.signOut();

        if (error) {
            botaoSair.disabled = false;
            botaoSair.textContent = "Sair da conta";
            alert("Não foi possível sair da conta. Tente novamente.");
            return;
        }

        window.location.href = "../landingPage/index.html";
    });
}

function obterDestino(perfil) {
    if (perfil.role === "super_admin") {
        return "../admin-geral/index.html";
    }

    if (perfil.role === "admin") {
        const paginas = {
            atendimento: "../admin-atendimento/index.html",
            comunicacao: "../admin-comunicacao/index.html",
            operacoes: "../admin-operacoes/index.html",
            gestao: "../admin-gestao/index.html"
        };

        return paginas[perfil.department_id] || "../login/index.html";
    }

    return "../dashboardCliente/index.html";
}

linkDashboard.addEventListener("click", async (evento) => {
    evento.preventDefault();

    const { data, error } =
        await window.supabaseClient.auth.getSession();

    if (error || !data.session) {
        window.location.href = "../login/index.html";
        return;
    }

    const { data: perfil, error: erroPerfil } =
        await window.supabaseClient
            .from("profiles")
            .select("role, department_id")
            .eq("id", data.session.user.id)
            .single();

    if (erroPerfil || !perfil) {
        window.location.href = "../login/index.html";
        return;
    }

    window.location.href = obterDestino(perfil);
});

const navbarScrollAzul = document.querySelector(".navbar");
const heroScrollAzul = document.querySelector(".hero");

function atualizarNavbar() {
    const limiteHero = heroScrollAzul.offsetTop + heroScrollAzul.offsetHeight;

    if (window.scrollY >= limiteHero - navbarScrollAzul.offsetHeight) {
        navbarScrollAzul.classList.add("navbar-rolagem");
    } else {
        navbarScrollAzul.classList.remove("navbar-rolagem");
    }
}

window.addEventListener("scroll", atualizarNavbar);
atualizarNavbar();

verificarSessao();