# Daedalus V9

Versión orientada a robustez y funcionamiento sin conexión después de la primera carga.

Cambios:
- Tipografías Montserrat y Raleway alojadas localmente.
- JSZip alojado localmente.
- Lectura básica de DOCX sin Mammoth externo.
- Exportación de comunicados sin html-to-image externo.
- Caché completo de la aplicación mediante service worker.
- Limpieza automática de cachés de versiones anteriores.
- Navegación con estrategia network-first y respaldo offline.

## Actualización en GitHub
Reemplaza los archivos de la raíz del repositorio por el contenido de `Daedalus_V9` y confirma los cambios.

## Importante en iPhone
Después de publicar:
1. Abre Daedalus una vez con internet.
2. Cierra y vuelve a abrir la PWA.
3. Para validar offline, activa modo avión y prueba abrir, editar y exportar.
