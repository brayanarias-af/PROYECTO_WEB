const NovaModelo = (() => {
  const leer = (clave) => {
    try {
      const datos = JSON.parse(localStorage.getItem(clave));
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  };

  const guardar = (clave, registros) => {
    localStorage.setItem(clave, JSON.stringify(registros));
    return registros;
  };

  const actualizar = (clave, cambio) => {
    const registros = cambio(leer(clave));
    return guardar(clave, registros);
  };

  return { leer, guardar, actualizar };
})();
