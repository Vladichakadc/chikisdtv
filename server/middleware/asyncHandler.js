// Envuelve un handler async de Express: si la promesa rechaza, registra el error
// y responde 500 con el mensaje — evita repetir try/catch en cada ruta.
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
  };
}

module.exports = asyncHandler;
