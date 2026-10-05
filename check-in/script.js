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

        async function carregarPerfilOrientacoes() {
            const cliente = document.getElementById("nomeCliente");
            const avatar = document.getElementById("avatarCliente");

            try {
                if (!window.supabaseClient) {
                    cliente.textContent = "Área do cliente";
                    return;
                }

                const { data: sessaoData } = await window.supabaseClient.auth.getSession();
                const usuario = sessaoData.session?.user;

                if (!usuario) {
                    cliente.textContent = "Visitante";
                    avatar.textContent = "CL";
                    return;
                }

                const { data: perfil } = await window.supabaseClient
                    .from("profiles")
                    .select("*")
                    .eq("id", usuario.id)
                    .maybeSingle();

                const nome = perfil?.nome_completo ||
                    usuario.user_metadata?.nome_completo ||
                    usuario.email ||
                    "Cliente";

                cliente.textContent = nome;
                avatar.textContent = nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(parte => parte[0])
                    .join("")
                    .toUpperCase();

            } catch (erro) {
                cliente.textContent = "Área do cliente";
            }
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

        carregarPerfilOrientacoes();
        lucide.createIcons();