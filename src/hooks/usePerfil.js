import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { perfilValido } from "../config/perfis";

export function usePerfil(usuario) {
  const uid = usuario?.uid;
  const [estado, setEstado] = useState({ perfil: null, carregando: true, erro: false });

  useEffect(() => {
    if (!db || !uid) {
      setEstado({ perfil: null, carregando: false, erro: !db });
      return undefined;
    }

    setEstado({ perfil: null, carregando: true, erro: false });

    return onSnapshot(
      doc(db, "usuarios", uid),
      (snap) => {
        const perfil = snap.exists() ? snap.data().perfil : null;
        setEstado({ perfil: perfilValido(perfil) ? perfil : null, carregando: false, erro: false });
      },
      (falha) => {
        console.error("Falha ao ler o perfil de acesso:", falha?.code);
        setEstado({ perfil: null, carregando: false, erro: true });
      }
    );
  }, [uid]);

  return estado;
}
