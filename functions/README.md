# SAMBRIX POS — fase de servidor, no desplegada

El punto de venta permanece deshabilitado mientras `platform/config.shopServerEnabled` no sea exactamente true. No habilitarlo en producción ni publicar la rama hasta superar staging.

## Arquitectura
- El navegador invoca exclusivamente `sambrixSellProducts` / `sambrixReturnProducts` (us-central1).
- La identidad proviene del token verificado de Firebase Auth, no del formulario.
- La función verifica en la misma transacción la empresa, perfil, miembro, cargo, estado, plan pro/premium y vencimiento.
- Los precios y saldos provienen de Firestore. Cada recibo admite hasta 3 referencias.
- La solicitud UUID se conserva localmente para reintentos y el servidor calcula el ID de operación y hash del contenido. Una repetición idéntica devuelve el mismo resultado; una distinta con el mismo ID se rechaza.
- Una venta modifica inventario, recibos, caja y auditoría en una transacción. Una devolución integral solo admite mercancía recibida en condiciones de volver a stock, sin ajuste financiero anterior; conserva el recibo original y crea corrección y egreso.
- No se ejecutan pagos bancarios.
- Los pedidos online nuevos y sus reservas/cancelaciones siguen deshabilitados; se admiten pedidos existentes que ya están en Firestore.
- Si una solicitud incierta no puede conciliarse, conservarla y contactar soporte. Todavía no hay cancelación de solicitudes pendientes con confirmación de servidor.

## QA
Las reglas experimentales de escritura desde navegador se conservan en tests/experimental. No desplegarlas: excedieron el límite de evaluación de Firestore.
El archivo activo de reglas conserva el esquema validado de inventario y finanzas, con rechazo de filas POS directas.
`npm test` comprueba las regresiones puras y el navegador se comprueba en CI. El emulador de Firestore prueba el servicio con un contexto privilegiado de ensayo y usuarios ficticios, no con un endpoint callable desplegado. El job server-check instala y carga el paquete.
Para un entorno de ensayo específico, usar firebase.shop.json con emuladores y proyecto demo; nunca usar el proyecto de producción para las pruebas. La configuración de funciones está separada deliberadamente de firebase.json. No activar el indicador en una empresa real antes de verificar Auth, endpoint, datos y permisos en staging.

## Pendiente
Validar endpoint callable real en entorno aislado con Firebase Auth; conciliación de solicitudes pendientes y soporte, copias/restauración de metadatos de tienda y correcciones, ventas de más de tres referencias, devoluciones parciales por producto, restauración de productos archivados, tienda pública, disponibilidad pública tras ventas de cajero, moneda y zona horaria (UTC si no configurada), prueba de volumen y facturación del servicio antes de desplegar. Las reglas antiguas de movimientos financieros ordinarios no constituyen un libro contable granular totalmente inmutable.
