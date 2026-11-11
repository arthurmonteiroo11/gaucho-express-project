const TODAS_AS_ROTAS = ["/", "/atendimento", "/kds", "/estoque", "/recepcao", "/caixa"];

export const PERFIS = {
  gerente: { rotulo: "Gerente", rotas: TODAS_AS_ROTAS },
  garcom: { rotulo: "Garçom", rotas: ["/atendimento"] },
  cozinha: { rotulo: "Cozinha", rotas: ["/kds"] },
  recepcao: { rotulo: "Recepção", rotas: ["/recepcao"] },
  caixa: { rotulo: "Caixa", rotas: ["/caixa"] },
};

export const perfilValido = (perfil) =>
  typeof perfil === "string" && Object.prototype.hasOwnProperty.call(PERFIS, perfil);

export const rotasPermitidas = (perfil) => (perfilValido(perfil) ? PERFIS[perfil].rotas : []);

export const podeAcessar = (perfil, caminho) => rotasPermitidas(perfil).includes(caminho);

export const rotaInicial = (perfil) => rotasPermitidas(perfil)[0] ?? null;

export const rotuloDoPerfil = (perfil) => (perfilValido(perfil) ? PERFIS[perfil].rotulo : "");
