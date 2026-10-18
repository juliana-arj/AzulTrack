const formLogin = document.getElementById("formLogin");
const mensagemLogin = document.getElementById("mensagemLogin");
const botaoEntrar = document.getElementById("botaoEntrar");

formLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    mensagemLogin.textContent = "";
    mensagemLogin.className = "mensagem-login";
    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    const email = document.getElementById("usuario").value.trim();
    const senha = document.getElementById("senha").value;

    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            throw new Error("E-mail ou senha inválidos.");
        }

        const { data: perfil, error: erroPerfil } = await window.supabaseClient
            .from("profiles")
            .select("role, department_id")
            .eq("id", data.user.id)
            .single();

        if (erroPerfil || !perfil) {
            await window.supabaseClient.auth.signOut();
            throw new Error("Não foi possível carregar seu perfil.");
        }

        if (perfil.role === "super_admin") {
            window.location.href = "../dashboardAdm/index.html";
            return;
        }

        if (perfil.department_id) {
            window.location.href = "../dashboardAdm/index.html";
            return;
        }

        if (perfil.role === "user" && !perfil.department_id) {
            window.location.href = "../landingPage/index.html";
            return;
        }

        await window.supabaseClient.auth.signOut();
        throw new Error("Perfil de usuário não reconhecido.");

    } catch (erro) {
        mensagemLogin.textContent =
            erro.message || "Não foi possível entrar. Tente novamente.";

        mensagemLogin.className = "mensagem-login erro";
    } finally {
        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }
});